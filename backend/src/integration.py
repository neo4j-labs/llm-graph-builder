"""
跨教材知识图谱整合模块

实现多本教材知识图谱的语义对齐、去重、整合和压缩比控制。
核心策略：双重对齐（嵌入相似度 + LLM 精准判断）
"""

import logging
import os
import json
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, asdict
import numpy as np
from sentence_transformers import SentenceTransformer, util
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv
from collections import defaultdict
import asyncio

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class IntegrationDecision:
    """整合决策数据类"""
    decision_id: str
    action: str  # merge, keep, remove
    affected_nodes: List[str]
    result_node: Optional[Dict[str, Any]] = None
    reason: str = ""
    confidence: float = 1.0


@dataclass
class IntegrationStatistics:
    """整合统计数据类"""
    original_node_count: int
    merged_node_count: int
    original_char_count: int
    merged_char_count: int
    compression_ratio: float
    merge_count: int
    keep_count: int
    remove_count: int


class KnowledgeGraphIntegrator:
    """知识图谱整合器"""
    
    def __init__(
        self,
        llm: Optional[ChatOpenAI] = None,
        embedding_model: Optional[SentenceTransformer] = None,
        similarity_threshold: float = 0.85,
        llm_verify_min: float = 0.75,
        llm_verify_max: float = 0.95,
        target_compression_ratio: float = 0.30
    ):
        """
        初始化整合器
        
        Args:
            llm: LLM 模型实例
            embedding_model: 嵌入模型实例
            similarity_threshold: 相似度阈值
            llm_verify_min: LLM 验证最小阈值
            llm_verify_max: LLM 验证最大阈值
            target_compression_ratio: 目标压缩比
        """
        self.llm = llm or self._create_llm()
        self.embedding_model = embedding_model or self._load_embedding_model()
        self.similarity_threshold = similarity_threshold
        self.llm_verify_min = llm_verify_min
        self.llm_verify_max = llm_verify_max
        self.target_compression_ratio = target_compression_ratio
        
        logger.info(
            f"KnowledgeGraphIntegrator initialized with "
            f"similarity_threshold={similarity_threshold}, "
            f"target_compression_ratio={target_compression_ratio}"
        )
    
    def _create_llm(self) -> ChatOpenAI:
        """创建 LLM 实例"""
        base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
        api_key = os.getenv("LLM_API_KEY")
        model_name = os.getenv("LLM_MODEL_NAME", "gpt-3.5-turbo")
        
        if not api_key:
            raise ValueError("LLM_API_KEY environment variable is required")
        
        logger.info(f"Creating LLM with model: {model_name}")
        return ChatOpenAI(
            base_url=base_url,
            api_key=api_key,
            model=model_name,
            temperature=0
        )
    
    def _load_embedding_model(self) -> SentenceTransformer:
        """加载嵌入模型（优先使用本地路径）"""
        os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
        model_name = os.getenv("EMBEDDING_MODEL", "/data/models/bge-m3")
        logger.info(f"Loading embedding model: {model_name}")
        
        try:
            model = SentenceTransformer(model_name)
            logger.info(f"Embedding model loaded successfully")
            return model
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    
    async def compute_semantic_alignment(
        self,
        all_nodes: List[Dict[str, Any]]
    ) -> List[Tuple[Dict, Dict, float]]:
        """
        阶段一：使用嵌入相似度进行快速筛选
        
        Args:
            all_nodes: 所有知识点节点列表
            
        Returns:
            候选合并对列表 [(node1, node2, similarity), ...]
        """
        logger.info(f"Starting semantic alignment for {len(all_nodes)} nodes")
        
        # 按教材分组
        textbook_nodes = defaultdict(list)
        for node in all_nodes:
            textbook_id = node.get("textbook_id", "unknown")
            textbook_nodes[textbook_id].append(node)
        
        logger.info(f"Nodes grouped into {len(textbook_nodes)} textbooks")
        
        # 生成节点文本描述（用于嵌入）
        node_texts = []
        node_indices = []
        
        for idx, node in enumerate(all_nodes):
            text = self._generate_node_text(node)
            node_texts.append(text)
            node_indices.append(idx)
        
        # 批量计算嵌入向量
        logger.info("Computing embeddings for all nodes...")
        embeddings = self.embedding_model.encode(
            node_texts,
            convert_to_tensor=True,
            show_progress_bar=True
        )
        
        # 计算跨教材的相似度
        candidate_pairs = []
        textbook_ids = list(textbook_nodes.keys())
        
        for i in range(len(textbook_ids)):
            for j in range(i + 1, len(textbook_ids)):
                textbook_i = textbook_ids[i]
                textbook_j = textbook_ids[j]
                
                nodes_i = textbook_nodes[textbook_i]
                nodes_j = textbook_nodes[textbook_j]
                
                logger.info(
                    f"Comparing {textbook_i} ({len(nodes_i)} nodes) with "
                    f"{textbook_j} ({len(nodes_j)} nodes)"
                )
                
                # 获取对应的嵌入向量索引
                indices_i = [all_nodes.index(n) for n in nodes_i]
                indices_j = [all_nodes.index(n) for n in nodes_j]
                
                embeddings_i = embeddings[indices_i]
                embeddings_j = embeddings[indices_j]
                
                # 计算余弦相似度矩阵
                similarity_matrix = util.cos_sim(embeddings_i, embeddings_j)
                
                # 筛选高相似度对
                for idx_i, emb_i in enumerate(embeddings_i):
                    for idx_j, emb_j in enumerate(embeddings_j):
                        similarity = similarity_matrix[idx_i][idx_j].item()
                        
                        if similarity >= self.similarity_threshold:
                            node_i = nodes_i[idx_i]
                            node_j = nodes_j[idx_j]
                            candidate_pairs.append((node_i, node_j, similarity))
        
        logger.info(
            f"Found {len(candidate_pairs)} candidate pairs with "
            f"similarity >= {self.similarity_threshold}"
        )
        
        return candidate_pairs
    
    def _generate_node_text(self, node: Dict[str, Any]) -> str:
        """生成节点的文本描述用于嵌入"""
        name = node.get("name", "")
        definition = node.get("definition", "")
        category = node.get("category", "")
        
        # 组合名称、定义和分类
        text = f"{name}"
        if definition:
            text += f" {definition}"
        if category:
            text += f" 类别: {category}"
        
        return text
    
    async def llm_verify_alignment(
        self,
        candidate_pairs: List[Tuple[Dict, Dict, float]]
    ) -> List[Dict[str, Any]]:
        """
        阶段二：使用 LLM 进行精准判断
        
        Args:
            candidate_pairs: 候选合并对
            
        Returns:
            验证结果列表
        """
        logger.info(f"Starting LLM verification for {len(candidate_pairs)} pairs")
        
        # 过滤需要 LLM 验证的对（相似度在阈值范围内）
        pairs_to_verify = [
            (node_a, node_b, sim) for node_a, node_b, sim in candidate_pairs
            if self.llm_verify_min <= sim <= self.llm_verify_max
        ]
        
        # 高于上限的直接认为相同
        high_similarity_pairs = [
            (node_a, node_b, sim) for node_a, node_b, sim in candidate_pairs
            if sim > self.llm_verify_max
        ]
        
        logger.info(
            f"High similarity pairs (auto-merge): {len(high_similarity_pairs)}, "
            f"Pairs to verify with LLM: {len(pairs_to_verify)}"
        )
        
        verified_results = []
        
        # 处理高相似度对（直接合并）
        for node_a, node_b, sim in high_similarity_pairs:
            verified_results.append({
                "node_a": node_a,
                "node_b": node_b,
                "is_same": True,
                "confidence": sim,
                "reason": f"嵌入相似度很高 ({sim:.3f})，自动判定为同一概念"
            })
        
        # 批量 LLM 验证
        if pairs_to_verify:
            batch_size = 5  # 控制并发数
            for i in range(0, len(pairs_to_verify), batch_size):
                batch = pairs_to_verify[i:i + batch_size]
                
                tasks = [
                    self._llm_verify_single_pair(node_a, node_b, sim)
                    for node_a, node_b, sim in batch
                ]
                
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in batch_results:
                    if isinstance(result, Exception):
                        logger.error(f"LLM verification error: {result}")
                    else:
                        verified_results.append(result)
                
                logger.info(
                    f"Verified {min(i + batch_size, len(pairs_to_verify))}/{len(pairs_to_verify)} pairs"
                )
        
        # 统计
        same_count = sum(1 for r in verified_results if r.get("is_same"))
        logger.info(
            f"LLM verification complete: {same_count}/{len(verified_results)} "
            f"pairs confirmed as same concept"
        )
        
        return verified_results
    
    async def _llm_verify_single_pair(
        self,
        node_a: Dict[str, Any],
        node_b: Dict[str, Any],
        similarity: float
    ) -> Dict[str, Any]:
        """使用 LLM 验证单个节点对"""
        
        system_prompt = """你是一个医学知识图谱专家。你的任务是判断两个知识点是否描述同一个概念。

输出要求：
- 仅输出 JSON 格式
- 格式：{"is_same": true/false, "confidence": 0.0-1.0, "reason": "判断理由"}
- confidence 表示你对判断的确信度（0-1之间的小数）
- reason 用一句话说明判断依据"""
        
        user_prompt = f"""请判断以下两个知识点是否描述同一概念：

知识点A：
- 名称：{node_a.get('name', 'N/A')}
- 定义：{node_a.get('definition', 'N/A')}
- 来源教材：{node_a.get('textbook_id', 'N/A')}
- 类别：{node_a.get('category', 'N/A')}

知识点B：
- 名称：{node_b.get('name', 'N/A')}
- 定义：{node_b.get('definition', 'N/A')}
- 来源教材：{node_b.get('textbook_id', 'N/A')}
- 类别：{node_b.get('category', 'N/A')}

语义相似度：{similarity:.3f}

请给出你的判断（仅输出 JSON）："""
        
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            response = await self.llm.ainvoke(messages)
            content = response.content.strip()
            
            # 尝试解析 JSON
            # 移除可能的 markdown 代码块标记
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            result = json.loads(content)
            
            return {
                "node_a": node_a,
                "node_b": node_b,
                "is_same": result.get("is_same", False),
                "confidence": result.get("confidence", 0.5),
                "reason": result.get("reason", "")
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {content}, error: {e}")
            # 回退方案：基于相似度阈值
            return {
                "node_a": node_a,
                "node_b": node_b,
                "is_same": similarity >= 0.88,
                "confidence": similarity,
                "reason": f"LLM 解析失败，基于相似度 {similarity:.3f} 判断"
            }
        
        except Exception as e:
            logger.error(f"Error in LLM verification: {e}")
            return {
                "node_a": node_a,
                "node_b": node_b,
                "is_same": False,
                "confidence": 0.0,
                "reason": f"验证失败: {str(e)}"
            }
    
    def make_integration_decisions(
        self,
        verified_results: List[Dict[str, Any]],
        all_nodes: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        阶段三：生成整合决策
        
        Args:
            verified_results: LLM 验证结果
            all_nodes: 所有节点
            
        Returns:
            整合决策和统计信息
        """
        logger.info("Generating integration decisions...")
        
        decisions = []
        decision_id_counter = 1
        
        # 构建节点 ID 到节点的映射
        node_map = {node.get("id"): node for node in all_nodes}
        
        # 标记已处理的节点
        processed_nodes = set()
        
        # 构建相同概念的节点组
        same_concept_groups = self._build_concept_groups(verified_results)
        
        # 处理合并决策
        merge_counter = 1
        for group in same_concept_groups:
            if len(group["nodes"]) > 1:
                # 选择最佳定义
                best_node = self._get_best_definition(group["nodes"])
                affected_node_ids = [n.get("id") for n in group["nodes"]]
                
                # 获取来源教材
                sources = list(set([
                    n.get("textbook_name", n.get("textbook_id", "未知"))
                    for n in group["nodes"]
                ]))
                
                result_node = {
                    "id": f"merged_node_{merge_counter:03d}",
                    "name": best_node.get("name"),
                    "definition": best_node.get("definition"),
                    "category": best_node.get("category"),
                    "sources": sources
                }
                
                decision = IntegrationDecision(
                    decision_id=f"merge_{merge_counter:03d}",
                    action="merge",
                    affected_nodes=affected_node_ids,
                    result_node=result_node,
                    reason=f"{'、'.join(sources)} 均描述了相同概念，保留最完整的定义",
                    confidence=group.get("avg_confidence", 0.9)
                )
                
                decisions.append(decision)
                processed_nodes.update(affected_node_ids)
                merge_counter += 1
        
        # 处理保留决策（未被合并的唯一节点）
        keep_counter = 1
        for node in all_nodes:
            node_id = node.get("id")
            if node_id not in processed_nodes:
                decision = IntegrationDecision(
                    decision_id=f"keep_{keep_counter:03d}",
                    action="keep",
                    affected_nodes=[node_id],
                    reason="该知识点在其他教材中无重复或相似内容"
                )
                decisions.append(decision)
                processed_nodes.add(node_id)
                keep_counter += 1
        
        # 计算统计信息
        statistics = self._calculate_statistics(decisions, all_nodes)
        
        logger.info(
            f"Integration decisions generated: "
            f"{statistics.merge_count} merges, "
            f"{statistics.keep_count} keeps, "
            f"{statistics.remove_count} removes, "
            f"compression ratio: {statistics.compression_ratio:.2%}"
        )
        
        return {
            "decisions": [asdict(d) for d in decisions],
            "statistics": asdict(statistics)
        }
    
    def _build_concept_groups(
        self,
        verified_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """构建相同概念的节点组"""
        from collections import defaultdict
        import networkx as nx
        
        # 构建图：节点之间如果是同一概念则连边
        G = nx.Graph()
        
        for result in verified_results:
            if result.get("is_same"):
                node_a = result["node_a"]
                node_b = result["node_b"]
                node_a_id = node_a.get("id")
                node_b_id = node_b.get("id")
                
                G.add_edge(
                    node_a_id,
                    node_b_id,
                    confidence=result.get("confidence", 0.9)
                )
                
                # 存储节点数据
                G.nodes[node_a_id]["data"] = node_a
                G.nodes[node_b_id]["data"] = node_b
        
        # 查找连通分量（相同概念的节点组）
        groups = []
        for component in nx.connected_components(G):
            nodes = [G.nodes[node_id]["data"] for node_id in component]
            
            # 计算组内平均置信度
            edges = list(G.edges(component, data=True))
            avg_confidence = np.mean([e[2]["confidence"] for e in edges]) if edges else 0.9
            
            groups.append({
                "nodes": nodes,
                "avg_confidence": avg_confidence
            })
        
        return groups
    
    def _get_best_definition(self, node_group: List[Dict[str, Any]]) -> Dict[str, Any]:
        """从节点组中选择定义最完整的节点"""
        best_node = max(
            node_group,
            key=lambda n: len(n.get("definition", ""))
        )
        return best_node
    
    def _calculate_statistics(
        self,
        decisions: List[IntegrationDecision],
        all_nodes: List[Dict[str, Any]]
    ) -> IntegrationStatistics:
        """计算整合统计信息"""
        
        original_node_count = len(all_nodes)
        
        merge_decisions = [d for d in decisions if d.action == "merge"]
        keep_decisions = [d for d in decisions if d.action == "keep"]
        remove_decisions = [d for d in decisions if d.action == "remove"]
        
        merge_count = len(merge_decisions)
        keep_count = len(keep_decisions)
        remove_count = len(remove_decisions)
        
        # 计算合并后的节点数
        merged_node_count = merge_count + keep_count
        
        # 计算字符数
        original_char_count = sum(
            len(node.get("definition", "")) + len(node.get("name", ""))
            for node in all_nodes
        )
        
        merged_char_count = 0
        for decision in decisions:
            if decision.action == "merge" and decision.result_node:
                merged_char_count += (
                    len(decision.result_node.get("definition", "")) +
                    len(decision.result_node.get("name", ""))
                )
            elif decision.action == "keep":
                # 找到原始节点
                node_id = decision.affected_nodes[0]
                node = next((n for n in all_nodes if n.get("id") == node_id), None)
                if node:
                    merged_char_count += (
                        len(node.get("definition", "")) + len(node.get("name", ""))
                    )
        
        # 计算压缩比
        compression_ratio = (
            merged_char_count / original_char_count
            if original_char_count > 0
            else 0.0
        )
        
        return IntegrationStatistics(
            original_node_count=original_node_count,
            merged_node_count=merged_node_count,
            original_char_count=original_char_count,
            merged_char_count=merged_char_count,
            compression_ratio=compression_ratio,
            merge_count=merge_count,
            keep_count=keep_count,
            remove_count=remove_count
        )
    
    async def adjust_compression(
        self,
        decisions: Dict[str, Any],
        all_nodes: List[Dict[str, Any]],
        max_iterations: int = 3
    ) -> Dict[str, Any]:
        """
        阶段四：动态调整压缩比
        
        Args:
            decisions: 初始决策
            all_nodes: 所有节点
            max_iterations: 最大迭代次数
            
        Returns:
            调整后的决策
        """
        logger.info("Starting compression ratio adjustment...")
        
        current_ratio = decisions["statistics"]["compression_ratio"]
        iteration = 0
        
        while iteration < max_iterations:
            logger.info(
                f"Iteration {iteration + 1}: "
                f"Current compression ratio = {current_ratio:.2%}, "
                f"Target = {self.target_compression_ratio:.2%}"
            )
            
            # 检查是否在可接受范围内
            if abs(current_ratio - self.target_compression_ratio) < 0.05:
                logger.info("Compression ratio is within acceptable range")
                break
            
            # 压缩不足（>30%），需要增加合并
            if current_ratio > self.target_compression_ratio:
                logger.info("Compression insufficient, lowering similarity threshold")
                self.similarity_threshold = max(0.75, self.similarity_threshold - 0.05)
                
            # 压缩过度（<20%），需要保留更多内容
            elif current_ratio < 0.20:
                logger.info("Over-compressed, raising similarity threshold")
                self.similarity_threshold = min(0.95, self.similarity_threshold + 0.05)
            else:
                # 在20-30%之间，可以接受
                logger.info("Compression ratio is acceptable (20-30%)")
                break
            
            # 重新计算对齐和决策
            logger.info(f"Re-computing with new threshold: {self.similarity_threshold}")
            candidate_pairs = await self.compute_semantic_alignment(all_nodes)
            verified_results = await self.llm_verify_alignment(candidate_pairs)
            decisions = self.make_integration_decisions(verified_results, all_nodes)
            
            current_ratio = decisions["statistics"]["compression_ratio"]
            iteration += 1
        
        logger.info(
            f"Compression adjustment complete after {iteration} iterations. "
            f"Final ratio: {current_ratio:.2%}"
        )
        
        return decisions


async def integrate_knowledge_graphs(
    all_textbook_data: List[Dict[str, Any]],
    llm: Optional[ChatOpenAI] = None,
    embedding_model: Optional[SentenceTransformer] = None,
    target_compression_ratio: float = 0.30,
    on_progress: Optional[Any] = None
) -> Dict[str, Any]:
    """
    知识图谱整合主入口函数
    
    Args:
        all_textbook_data: 所有教材的知识图谱数据列表
            格式: [
                {
                    "textbook_id": "book_01",
                    "textbook_name": "病理学",
                    "nodes": [...],
                    "relations": [...]
                },
                ...
            ]
        llm: LLM 实例（可选）
        embedding_model: 嵌入模型实例（可选）
        target_compression_ratio: 目标压缩比（默认 0.30）
        
    Returns:
        整合结果和统计信息
    """
    logger.info(f"Starting knowledge graph integration for {len(all_textbook_data)} textbooks")
    
    # 合并所有节点
    all_nodes = []
    for textbook in all_textbook_data:
        textbook_id = textbook.get("textbook_id")
        textbook_name = textbook.get("textbook_name", textbook_id)
        nodes = textbook.get("nodes", [])
        
        # 为每个节点添加教材信息
        for node in nodes:
            node["textbook_id"] = textbook_id
            node["textbook_name"] = textbook_name
            all_nodes.append(node)
    
    logger.info(f"Total nodes to integrate: {len(all_nodes)}")
    
    # 创建整合器
    integrator = KnowledgeGraphIntegrator(
        llm=llm,
        embedding_model=embedding_model,
        target_compression_ratio=target_compression_ratio
    )
    
    # 执行整合流程
    try:
        # 阶段一：语义对齐
        if on_progress:
            await on_progress({
                "event": "progress", "phase": "alignment",
                "step": "阶段一：语义对齐 — 计算节点嵌入向量",
                "current": 1, "total": 4, "percent": 10,
                "partialResult": {"totalNodes": len(all_nodes)}
            })
        candidate_pairs = await integrator.compute_semantic_alignment(all_nodes)
        
        # 阶段二：LLM 验证
        if on_progress:
            await on_progress({
                "event": "progress", "phase": "verification",
                "step": f"阶段二：LLM 验证 — 共 {len(candidate_pairs)} 对候选",
                "current": 2, "total": 4, "percent": 35,
                "partialResult": {"candidatePairs": len(candidate_pairs)}
            })
        verified_results = await integrator.llm_verify_alignment(candidate_pairs)
        
        # 阶段三：生成决策
        if on_progress:
            await on_progress({
                "event": "progress", "phase": "decision",
                "step": "阶段三：生成整合决策",
                "current": 3, "total": 4, "percent": 65,
                "partialResult": {"verifiedPairs": len(verified_results)}
            })
        decisions = integrator.make_integration_decisions(verified_results, all_nodes)
        
        # 阶段四：调整压缩比
        if on_progress:
            await on_progress({
                "event": "progress", "phase": "compression",
                "step": "阶段四：调整压缩比",
                "current": 4, "total": 4, "percent": 85,
                "partialResult": {}
            })
        final_decisions = await integrator.adjust_compression(decisions, all_nodes)
        
        logger.info("Knowledge graph integration completed successfully")
        
        if on_progress:
            stats = final_decisions.get("statistics", {})
            await on_progress({
                "event": "complete", "phase": "done",
                "step": "跨教材整合完成",
                "current": 4, "total": 4, "percent": 100,
                "partialResult": {
                    "compressionRatio": stats.get("compression_ratio", 0),
                    "mergeCount": stats.get("merge_count", 0),
                    "decisionsCount": len(final_decisions.get("decisions", []))
                }
            })
        
        return final_decisions
        
    except Exception as e:
        logger.error(f"Error during knowledge graph integration: {e}", exc_info=True)
        if on_progress:
            await on_progress({
                "event": "error", "phase": "error",
                "step": f"整合失败: {str(e)}",
                "current": 0, "total": 0, "percent": 0,
                "partialResult": {}
            })
        raise


def calculate_compression_ratio(
    original_nodes: List[Dict[str, Any]],
    decisions: Dict[str, Any]
) -> float:
    """
    计算压缩比
    
    Args:
        original_nodes: 原始节点列表
        decisions: 整合决策
        
    Returns:
        压缩比（0-1之间）
    """
    stats = decisions.get("statistics", {})
    return stats.get("compression_ratio", 0.0)


def get_best_definition(node_group: List[Dict[str, Any]]) -> str:
    """
    从节点组中选择最完整的定义
    
    Args:
        node_group: 节点组
        
    Returns:
        最佳定义文本
    """
    if not node_group:
        return ""
    
    best_node = max(
        node_group,
        key=lambda n: len(n.get("definition", ""))
    )
    
    return best_node.get("definition", "")


# 示例用法
async def main():
    """示例：运行知识图谱整合"""
    
    # 示例数据
    test_data = [
        {
            "textbook_id": "book_01",
            "textbook_name": "病理学",
            "nodes": [
                {
                    "id": "book_01_node_001",
                    "name": "炎症",
                    "definition": "组织对损伤因子的防御性反应，包括变质、渗出和增生",
                    "category": "核心概念"
                },
                {
                    "id": "book_01_node_002",
                    "name": "肿瘤",
                    "definition": "机体在各种致瘤因素作用下，局部组织的细胞异常增生",
                    "category": "核心概念"
                }
            ],
            "relations": []
        },
        {
            "textbook_id": "book_02",
            "textbook_name": "病理生理学",
            "nodes": [
                {
                    "id": "book_02_node_001",
                    "name": "炎症反应",
                    "definition": "机体对损伤的局部反应，具有防御和修复作用",
                    "category": "病理过程"
                }
            ],
            "relations": []
        }
    ]
    
    # 执行整合
    result = await integrate_knowledge_graphs(test_data)
    
    # 打印结果
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
