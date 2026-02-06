# @ledgermind/cli

Interactive command-line interface for LedgerMind - Decision Memory for AI Systems.

## Installation

```bash
# From the monorepo root
npm install
cd packages/cli
npm run build
npm link  # Makes 'ledgermind' command available globally
```

## Quick Start

```bash
# Initialize configuration
ledgermind init

# Check API status
ledgermind status

# Show quickstart guide
ledgermind quickstart
```

## Commands

### General

```bash
ledgermind init          # Configure API URL, API key, tenant ID
ledgermind status        # Check API connection and stats
ledgermind quickstart    # Show getting started guide
ledgermind dashboard     # Open web dashboard in browser
```

### Traces

```bash
ledgermind traces list               # List recent traces
ledgermind traces list --limit 20    # List more traces
ledgermind traces view <traceId>     # View trace details with events
ledgermind traces search <query>     # Search traces by content
```

### Policies

```bash
ledgermind policies list             # List all policies
ledgermind policies create           # Create new policy (interactive)
ledgermind policies toggle <id>      # Toggle policy active status
```

### Overrides

```bash
ledgermind overrides list            # List recent human overrides
ledgermind overrides record          # Record a new override (interactive)
```

### AI Features

```bash
ledgermind similar "approve invoice over 10k"  # Find similar past decisions
ledgermind similar "customer refund" --limit 3 # Limit results
ledgermind explain <traceId>                   # Get AI explanation
```

## Configuration

Configuration is stored in `~/.config/ledgermind/config.json`:

```json
{
  "apiUrl": "http://localhost:3000",
  "apiKey": "your-api-key",
  "tenantId": "default",
  "dashboardUrl": "http://localhost:3001"
}
```

## Example Session

```bash
# Start services
cd services/api && npm run dev &
cd dashboard && npm run dev &

# Configure CLI
ledgermind init
# ? API URL: http://localhost:3000
# ? API Key: dev-key
# ? Tenant ID: default
# ? Dashboard URL: http://localhost:3001

# Check status
ledgermind status
# ✔ Connected to LedgerMind API
# API Status: ● Online
# Total Traces: 12
# Total Events: 47
# Total Overrides: 3
# Active Policies: 2

# View recent traces
ledgermind traces list
# ID          Agent      Status     Events  Created
# abc123...   invoices   completed  5       1/16/2025, 11:00 AM
# def456...   refunds    active     2       1/16/2025, 10:45 AM

# Create a policy
ledgermind policies create
# ? Policy name: High-value approval
# ? Policy type: Threshold
# ? Threshold value: 10000
# ? Priority: 1
# ? Activate immediately? Yes
# ✓ Policy Created!

# Find similar decisions
ledgermind similar "approve large purchase order"
# 🔍 Similar Decisions:
# #1 (92.3% match)
# Type: purchase_approval
# Input: "PO-2025-001 for $15,000"
# Output: { approved: true, reason: "within budget" }

# Open dashboard
ledgermind dashboard
# 🚀 Opening dashboard at http://localhost:3001...
```

## Requirements

- Node.js >= 20
- LedgerMind API running (see main README)
- OpenAI API key for AI features (similar, explain)

## License

MIT
