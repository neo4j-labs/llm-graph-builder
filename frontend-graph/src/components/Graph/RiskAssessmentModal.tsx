import React from "react";
import { Button, Modal, Typography } from "@neo4j-ndl/react";
import { XMarkIconOutline } from "@neo4j-ndl/react/icons";

interface RiskAssessment {
  indicator: string;
  weight: number;
  score: number;
  explanation: string;
  sources: string[];
  normalizedWeight: number;
  weightedContribution: number;
}

interface RiskAssessmentResult {
  entityName: string;
  entityType: string;
  riskAssessments: RiskAssessment[];
  calculation: {
    totalWeight: number;
    overallScore: number;
    thresholdsApplied: {
      red: string;
      yellow: string;
      blue: string;
    };
  };
  finalAssessment: {
    trafficLight: "Red" | "Yellow" | "Blue";
    overallExplanation: string;
  };
  analysis_metadata?: {
    chunks_analyzed: number;
    subgraph_nodes: number;
    subgraph_relationships: number;
    search_method: string;
    best_match_score: number | string;
  };
}

interface RiskAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  riskAssessment: RiskAssessmentResult | null;
  loading: boolean;
}

const RiskAssessmentModal: React.FC<RiskAssessmentModalProps> = ({
  isOpen,
  onClose,
  riskAssessment,
  loading,
}) => {
  const getTrafficLightColor = (trafficLight: string) => {
    switch (trafficLight) {
      case "Red":
        return "bg-red-500";
      case "Yellow":
        return "bg-yellow-500";
      case "Blue":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-red-600";
    if (score >= 2.5) return "text-yellow-600";
    return "text-blue-600";
  };

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onClose={onClose} size="large" className="max-w-4xl">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <Typography variant="h3">Risk Assessment Results</Typography>
          <Button
            onClick={onClose}
            variant="tertiary"
            size="small"
            className="p-2"
          >
            <XMarkIconOutline className="w-5 h-5" />
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <Typography variant="body-medium" className="ml-3">
              Analyzing risk...
            </Typography>
          </div>
        )}

        {!loading && riskAssessment && (
          <div className="space-y-6">
            {/* Entity Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Typography variant="h4" className="mb-2">
                    {riskAssessment.entityName}
                  </Typography>
                  <Typography variant="body-medium" className="text-gray-600">
                    Entity Type: {riskAssessment.entityType}
                  </Typography>
                </div>
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-4 h-4 rounded-full ${getTrafficLightColor(
                      riskAssessment.finalAssessment.trafficLight
                    )}`}
                  ></div>
                  <Typography
                    variant="h4"
                    className={`font-bold ${getScoreColor(
                      riskAssessment.calculation.overallScore
                    )}`}
                  >
                    {riskAssessment.finalAssessment.trafficLight}
                  </Typography>
                </div>
              </div>
            </div>

            {/* Overall Score */}
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <Typography variant="h4" className="mb-3">
                Overall Risk Score
              </Typography>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <Typography
                    variant="h2"
                    className={`font-bold ${getScoreColor(
                      riskAssessment.calculation.overallScore
                    )}`}
                  >
                    {riskAssessment.calculation.overallScore.toFixed(2)}
                  </Typography>
                  <Typography variant="body-small" className="text-gray-600">
                    out of 5.0
                  </Typography>
                </div>
                <div className="flex-1">
                  <Typography variant="body-medium" className="mb-2">
                    {riskAssessment.finalAssessment.overallExplanation}
                  </Typography>
                  <div className="text-sm text-gray-600">
                    <div>Red: ≥ 4.0 (High Risk)</div>
                    <div>Yellow: 2.5 - 3.99 (Medium Risk)</div>
                    <div>Blue: &lt; 2.5 (Low Risk)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Risk Assessments */}
            <div className="space-y-4">
              <Typography variant="h4">Risk Indicators</Typography>
              {riskAssessment.riskAssessments.map((assessment, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 p-4 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <Typography variant="h5" className="mb-1">
                        {assessment.indicator}
                      </Typography>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Weight: {assessment.weight}</span>
                        <span>Score: {assessment.score}/5</span>
                        <span>
                          Contribution:{" "}
                          {assessment.weightedContribution.toFixed(3)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        assessment.score >= 4
                          ? "bg-red-100 text-red-800"
                          : assessment.score >= 2.5
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {assessment.score}/5
                    </span>
                  </div>

                  <Typography variant="body-medium" className="mb-3">
                    {assessment.explanation}
                  </Typography>

                  <div>
                    <Typography
                      variant="body-small"
                      className="text-gray-600 mb-1"
                    >
                      Sources:
                    </Typography>
                    <div className="flex flex-wrap gap-2">
                      {assessment.sources.length > 0 ? (
                        assessment.sources.map((source, sourceIndex) => (
                          <span
                            key={sourceIndex}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {source === "nil" ? "No source available" : source}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          No sources available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Analysis Metadata */}
            {riskAssessment.analysis_metadata && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <Typography variant="h5" className="mb-3">
                  Analysis Information
                </Typography>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Typography variant="body-small" className="text-gray-600">
                      Chunks Analyzed
                    </Typography>
                    <Typography variant="body-medium" className="font-semibold">
                      {riskAssessment.analysis_metadata.chunks_analyzed}
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="body-small" className="text-gray-600">
                      Subgraph Nodes
                    </Typography>
                    <Typography variant="body-medium" className="font-semibold">
                      {riskAssessment.analysis_metadata.subgraph_nodes}
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="body-small" className="text-gray-600">
                      Search Method
                    </Typography>
                    <Typography variant="body-medium" className="font-semibold">
                      {riskAssessment.analysis_metadata.search_method}
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="body-small" className="text-gray-600">
                      Match Score
                    </Typography>
                    <Typography variant="body-medium" className="font-semibold">
                      {riskAssessment.analysis_metadata.best_match_score}
                    </Typography>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !riskAssessment && (
          <div className="text-center py-8">
            <Typography variant="body-medium" className="text-gray-600">
              No risk assessment data available
            </Typography>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RiskAssessmentModal;
