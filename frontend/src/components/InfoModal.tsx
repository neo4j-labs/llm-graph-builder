import { Box, Typography, Label, Button, TextLink, Tabs, Flex } from '@neo4j-ndl/react';
import { ClockIconOutline, DocumentTextIconOutline } from '@neo4j-ndl/react/icons';
import './info.css';
import Neo4jRetrievalLogo from '../assets/images/Neo4jRetrievalLogo.png';
import wikipedialogo from '../assets/images/Wikipedia-logo-v2.svg';
import youtubelogo from '../assets/images/youtube.png';
import { LabelColors, chatInfoMessage } from '../types';
import { useState, useMemo } from 'react';
const labelColors: LabelColors[] = ["default", "success", "info", "warning", "danger", undefined];
const parseEntity = (entity: string) => {
    const [label1, text1] = entity.split(/ [A-Z_]+ /)[0].split(':');
    const [label2, text2] = entity.split(/ [A-Z_]+ /)[1].split(':');
    return { label1, text1, label2, text2 };
};
const InfoModal: React.FC<chatInfoMessage> = (info) => {
    const { sources, entities, model, chunks } = info;
    const [activeTab, setActiveTab] = useState<number>(0);
    console.log('chunks', chunks);
    const groupedEntities = useMemo(() => {
        return entities?.reduce((acc, entity) => {
            const { label1, text1, label2, text2 } = parseEntity(entity);
            if (!acc[label1]) acc[label1] = { texts: new Set(), color: labelColors[Math.floor(Math.random() * labelColors.length)] };
            acc[label1].texts.add(text1);
            if (!acc[label2]) acc[label2] = { texts: new Set(), color: labelColors[Math.floor(Math.random() * labelColors.length)] };
            acc[label2].texts.add(text2);
            return acc;
        }, {} as Record<string, { texts: Set<string>, color: LabelColors }>);
    }, [entities]);
    return (
        <Box className="n-bg-palette-neutral-bg-weak p-4">
            <Box className='flex flex-row pb-6'>
                <img src={Neo4jRetrievalLogo} alt="icon" style={{ width: 95, height: 95, marginRight: 10 }} />
                <Box className='flex flex-col'>
                    <Typography variant="h2">Retrieval information</Typography>
                    <Typography variant="body-medium" sx={{ mb: 2 }}>
                        To generate this response, we used <span className='font-bold italic'>xx</span> tokens with the model <span className='font-bold italic'>{model}</span>.
                        <Typography className="pl-1 italic" variant="body-small"><ClockIconOutline className="w-4 h-4 inline-block mb-1" /> {8000 / 1000} seconds</Typography>
                    </Typography>
                </Box>
            </Box>
            <Tabs size='large' fill='underline' onChange={(e) => setActiveTab(e)} value={activeTab}>
                <Tabs.Tab tabId={0}>Sources used</Tabs.Tab>
                <Tabs.Tab tabId={1}>Entities used</Tabs.Tab>
                <Tabs.Tab tabId={2}>Chunks</Tabs.Tab>
            </Tabs>
            <Flex className='p-6'>
                {activeTab === 0 ? (
                    sources.length > 0 ? (
                        <ul className='list-none'>
                            {sources?.map((link, index) => (
                                <li key={index}>
                                    {link.startsWith('http') || link.startsWith('https') ? (
                                        <div className='flex flex-row inline-block'>
                                            {link.includes('wikipedia.org') ? (
                                                <img src={wikipedialogo} width={20} height={20} />
                                            ) : (
                                                <img src={youtubelogo} width={20} height={20} />
                                            )}
                                            <TextLink href={link} externalLink={true}>
                                                <div>{link}</div>
                                            </TextLink>
                                        </div>
                                    ) : (
                                        <div className='flex flex-row inline-block'>
                                            <DocumentTextIconOutline className="n-size-token-7" />
                                            <Typography variant='body-medium' className="text-ellipsis whitespace-nowrap max-w-[calc(100%-100px)] overflow-hidden">{link}</Typography>
                                            <Typography variant='body-small' className="italic"> - Page {Math.floor(Math.random() * 100)}</Typography>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Typography variant="body-medium">No sources found</Typography>
                    )
                ) : activeTab === 1 ? (
                    Object.keys(groupedEntities).length > 0 ? (
                        <ul className='list-none'>
                            {Object.keys(groupedEntities).map((label, index) => (
                                <li key={index} className='flex items-center mb-2' style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                    <Label color={groupedEntities[label].color} fill="semi-filled" className='entity-label mr-2'>{label}</Label>
                                    <Typography
                                        className='entity-text'
                                        variant='body-medium'
                                        sx={{
                                            display: 'inline-block',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 'calc(100% - 120px)',
                                        }}
                                    >
                                        {Array.from(groupedEntities[label].texts).join(', ')}
                                    </Typography>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Typography variant="body-medium">No entities found</Typography>
                    )
                ) : (
                    chunks.length > 0 ? (
                        <ul className='list-none'>
                            {chunks.map((chunkString, index) => (
                                <li key={index}>
                                    <Typography variant='body-medium' className="text-ellipsis whitespace-nowrap max-w-[calc(100%-100px)] overflow-hidden">{chunkString}</Typography>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Typography variant="body-medium">No chunks found</Typography>
                    )
                )}
            </Flex>
            <Box className="button-container">
                <Button className='w-[48%]'>Graph View</Button>
                <Button className='w-[48%]'>Chunk used</Button>
            </Box>
        </Box>
    );
}
export default InfoModal;