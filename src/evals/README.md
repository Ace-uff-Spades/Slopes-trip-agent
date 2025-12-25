# Accommodation Agent Evaluations

Evaluate the accommodation agent by calling the Next.js API.

## Quick Start

1. Install: `pip3 install -r requirements.txt`
2. Start Next.js: `npm run dev`
3. Run: `cd src/evals && python3 run_with_agent.py`

## Files

- `run_with_agent.py` - Main eval script (calls `/api/schedule/accommodation`)
- `accommodation_eval.py` - Evaluation functions (photo quality, completeness)
- `accommodation-agent-eval.json` - Test cases (JSON array)

## Evaluation Criteria

- **Photo Quality** (50%): No placeholder URLs
- **Completeness** (50%): All required fields present

## Configuration

```bash
export API_URL='http://localhost:3000/api/schedule/accommodation'  # Optional
export DEBUG=1  # Enable debug output
```

Results saved to `eval-results.json`.
