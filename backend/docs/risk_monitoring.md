# Risk Monitoring System Documentation

## Overview

The Risk Monitoring System is a comprehensive solution for monitoring documents for specific names and risk indicators. It uses LLM-powered analysis to detect potential risks and generate alerts when thresholds are exceeded.

## Features

- **Name Monitoring**: Track specific names across document content
- **Risk Indicator Analysis**: Analyze documents for various risk indicators
- **Intelligent Scoring**: AI-powered risk assessment with configurable thresholds
- **Alert Generation**: Automatic alert creation for high-risk situations
- **Fallback Mechanisms**: Robust error handling with fallback analysis
- **Performance Tracking**: Comprehensive logging and performance metrics

## API Endpoint

### `/risk_monitor`

**Method**: POST  
**Content-Type**: application/x-www-form-urlencoded

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `uri` | string | No | None | Database connection URI |
| `userName` | string | No | None | Database username |
| `password` | string | No | None | Database password |
| `database` | string | No | None | Database name |
| `document_name` | string | **Yes** | None | Name of document to monitor |
| `monitored_names` | string | No | [] | JSON array of names to monitor |
| `risk_indicators` | string | No | [] | JSON array of risk indicators |
| `risk_threshold` | float | No | 0.7 | Risk score threshold (0.0-1.0) |
| `model` | string | No | "gpt-4" | LLM model to use for analysis |
| `mode` | string | No | None | Processing mode |
| `email` | string | No | None | User email for logging |

#### Example Request

```bash
curl -X POST "http://localhost:8000/risk_monitor" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "document_name=sample_document.pdf" \
  -d "monitored_names=[\"John Doe\", \"Jane Smith\"]" \
  -d "risk_indicators=[\"financial_fraud\", \"regulatory_violation\"]" \
  -d "risk_threshold=0.6" \
  -d "model=gpt-4"
```

## Risk Indicators

### Predefined Risk Categories

1. **Financial Risks**
   - `financial_fraud`
   - `money_laundering`
   - `insider_trading`
   - `accounting_fraud`

2. **Regulatory Risks**
   - `regulatory_violation`
   - `compliance_breach`
   - `licensing_issues`
   - `regulatory_investigation`

3. **Operational Risks**
   - `data_breach`
   - `cybersecurity_threat`
   - `operational_disruption`
   - `supply_chain_risk`

4. **Reputational Risks**
   - `negative_publicity`
   - `customer_complaints`
   - `employee_misconduct`
   - `ethical_violations`

## Response Format

### Success Response

```json
{
  "status": "Success",
  "data": {
    "success": true,
    "document_name": "sample_document.pdf",
    "monitoring_summary": {
      "names_monitored": 2,
      "risk_indicators_checked": 2,
      "risk_threshold": 0.6,
      "total_risk_score": 0.75,
      "alert_required": true
    },
    "name_monitoring": {
      "names_found": [
        {
          "name": "John Doe",
          "occurrences": [
            {
              "chunk": 1,
              "context": "John Doe was mentioned in connection with...",
              "risk_score": 0.8
            }
          ],
          "overall_risk_score": 0.8
        }
      ]
    },
    "risk_analysis": {
      "indicators_found": [
        {
          "indicator": "financial_fraud",
          "evidence": "Mention of suspicious financial transactions...",
          "severity": "high",
          "risk_score": 0.9,
          "impact": "Potential financial loss and regulatory violations"
        }
      ]
    },
    "risk_assessment": {
      "overall_risk_score": 0.75,
      "name_risk_score": 0.8,
      "indicator_risk_score": 0.9,
      "alert_required": true,
      "risk_level": "HIGH"
    },
    "alerts": [
      {
        "type": "HIGH_RISK",
        "score": 0.75,
        "description": "Overall risk score 0.75 exceeds threshold 0.6",
        "timestamp": "2024-01-15T10:30:00"
      }
    ],
    "info": {
      "processing_time": 0,
      "document_size": 1024000,
      "chunks_analyzed": 15,
      "model_used": "gpt-4",
      "response_time": 2.34
    }
  }
}
```

### Error Response

```json
{
  "status": "Failed",
  "message": "Unable to perform risk monitoring",
  "error": "Document 'nonexistent.pdf' not found"
}
```

## Risk Levels

| Level | Score Range | Color | Action Required |
|-------|-------------|-------|-----------------|
| LOW | 0.0 - 0.3 | Green | Monitor |
| MEDIUM | 0.3 - 0.7 | Yellow | Review |
| HIGH | 0.7 - 1.0 | Red | Immediate Action Required |

## Implementation Details

### Core Functions

1. **`perform_risk_monitoring()`**: Main orchestration function
2. **`monitor_names_in_document()`**: Name monitoring with LLM analysis
3. **`analyze_risk_indicators()`**: Risk indicator analysis
4. **`generate_risk_assessment()`**: Risk scoring and alert generation

### LLM Integration

- Uses OpenAI GPT-4 by default
- Configurable model selection
- Structured prompt engineering
- JSON response parsing with fallbacks

### Database Queries

- Document existence validation
- Chunk extraction for analysis
- Efficient Neo4j graph queries
- Metadata preservation

### Error Handling

- Graceful degradation on LLM failures
- Fallback text-based analysis
- Comprehensive logging
- User-friendly error messages

## Usage Examples

### Basic Name Monitoring

```python
from src.risk_monitor import perform_risk_monitoring

result = perform_risk_monitoring(
    graph=graph_connection,
    document_name="financial_report.pdf",
    monitored_names=["John Doe", "Acme Corp"],
    risk_indicators=[],
    risk_threshold=0.7
)
```

### Comprehensive Risk Analysis

```python
result = perform_risk_monitoring(
    graph=graph_connection,
    document_name="compliance_document.pdf",
    monitored_names=["Jane Smith"],
    risk_indicators=[
        "financial_fraud",
        "regulatory_violation",
        "data_breach"
    ],
    risk_threshold=0.5,
    model="gpt-4"
)
```

## Performance Considerations

- **Chunk Processing**: Documents are processed in chunks for efficiency
- **LLM Optimization**: Temperature set to 0.1 for consistent results
- **Caching**: Consider implementing response caching for repeated queries
- **Async Processing**: Endpoint supports asynchronous processing

## Security Features

- Input validation and sanitization
- Access control integration
- Secure logging (passwords masked)
- Rate limiting considerations

## Monitoring and Logging

- Structured logging with JSON format
- Performance metrics tracking
- Error tracking and alerting
- User activity monitoring

## Troubleshooting

### Common Issues

1. **Document Not Found**
   - Verify document exists in database
   - Check document name spelling
   - Ensure proper database connection

2. **LLM Analysis Failures**
   - Check API key configuration
   - Verify model availability
   - Review prompt formatting

3. **Performance Issues**
   - Monitor chunk sizes
   - Check database performance
   - Review LLM response times

### Debug Mode

Enable detailed logging by setting log level to DEBUG:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Future Enhancements

- **Batch Processing**: Monitor multiple documents simultaneously
- **Real-time Monitoring**: Continuous monitoring with webhooks
- **Custom Risk Models**: User-defined risk assessment models
- **Integration APIs**: Connect with external risk management systems
- **Machine Learning**: Enhanced risk scoring with ML models

## Support

For technical support or questions about the Risk Monitoring System, please refer to the project documentation or contact the development team.
