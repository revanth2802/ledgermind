#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import boxen from 'boxen';
import axios, { AxiosInstance } from 'axios';
import Conf from 'conf';
import open from 'open';

// Config store
const config = new Conf({ projectName: 'ledgermind' });

// ASCII Art Logo
const logo = `
██╗     ███████╗██████╗  ██████╗ ███████╗██████╗ ███╗   ███╗██╗███╗   ██╗██████╗ 
██║     ██╔════╝██╔══██╗██╔════╝ ██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗
██║     █████╗  ██║  ██║██║  ███╗█████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║██║  ██║
██║     ██╔══╝  ██║  ██║██║   ██║██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██║  ██║
███████╗███████╗██████╔╝╚██████╔╝███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██████╔╝
╚══════╝╚══════╝╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ 
`;

// API Client
function getApiClient(): AxiosInstance {
  const apiUrl = config.get('apiUrl') as string || 'http://localhost:3000';
  const apiKey = config.get('apiKey') as string || 'cli-dev-key';
  const tenantId = config.get('tenantId') as string || 'default';
  
  return axios.create({
    baseURL: `${apiUrl}/api`,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Tenant-ID': tenantId
    }
  });
}

// Helper to format timestamps
function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

// Helper to truncate strings
function truncate(str: string, len: number): string {
  if (!str) return '';
  return str.length > len ? str.substring(0, len - 3) + '...' : str;
}

// Initialize CLI
const program = new Command();

program
  .name('ledgermind')
  .description('Decision Intelligence for AI Systems - Interactive CLI')
  .version('0.1.0');

// ==================== INIT ====================
program
  .command('init')
  .description('Initialize LedgerMind configuration')
  .action(async () => {
    console.log(chalk.hex('#FF6600')(logo));
    console.log(chalk.gray('Decision Intelligence for AI Systems\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiUrl',
        message: 'API URL:',
        default: config.get('apiUrl') || 'http://localhost:3000'
      },
      {
        type: 'input',
        name: 'apiKey',
        message: 'API Key:',
        default: config.get('apiKey') || 'cli-dev-key'
      },
      {
        type: 'input',
        name: 'tenantId',
        message: 'Tenant ID:',
        default: config.get('tenantId') || 'default'
      },
      {
        type: 'input',
        name: 'dashboardUrl',
        message: 'Dashboard URL:',
        default: config.get('dashboardUrl') || 'http://localhost:3001'
      }
    ]);

    config.set('apiUrl', answers.apiUrl);
    config.set('apiKey', answers.apiKey);
    config.set('tenantId', answers.tenantId);
    config.set('dashboardUrl', answers.dashboardUrl);

    console.log(boxen(
      chalk.green('✓ Configuration saved!\n\n') +
      chalk.gray('API URL: ') + chalk.white(answers.apiUrl) + '\n' +
      chalk.gray('Tenant: ') + chalk.white(answers.tenantId) + '\n' +
      chalk.gray('Dashboard: ') + chalk.white(answers.dashboardUrl),
      { padding: 1, margin: 1, borderColor: 'green', borderStyle: 'round' }
    ));
  });

// ==================== CONFIG ====================
program
  .command('config')
  .description('Get or set configuration values')
  .argument('[key]', 'Configuration key (apiUrl, apiKey, tenantId, dashboardUrl)')
  .argument('[value]', 'Value to set')
  .action(async (key?: string, value?: string) => {
    if (!key) {
      // Show all config
      console.log(chalk.hex('#FF6600').bold('\n⚙️  Current Configuration\n'));
      console.log(chalk.gray('API URL:    ') + chalk.white(config.get('apiUrl') || 'http://localhost:3000'));
      console.log(chalk.gray('API Key:    ') + chalk.white(config.get('apiKey') ? '********' : '(not set)'));
      console.log(chalk.gray('Tenant ID:  ') + chalk.white(config.get('tenantId') || 'default'));
      console.log(chalk.gray('Dashboard:  ') + chalk.white(config.get('dashboardUrl') || 'http://localhost:3001'));
      console.log(chalk.gray('\nUse: ledgermind config <key> <value> to set a value'));
      return;
    }

    const validKeys = ['apiUrl', 'apiKey', 'tenantId', 'dashboardUrl'];
    if (!validKeys.includes(key)) {
      console.log(chalk.red(`Invalid key: ${key}`));
      console.log(chalk.gray(`Valid keys: ${validKeys.join(', ')}`));
      return;
    }

    if (!value) {
      // Get single value
      const val = config.get(key);
      console.log(val || chalk.gray('(not set)'));
      return;
    }

    // Set value
    config.set(key, value);
    console.log(chalk.green(`✓ Set ${key} = ${key === 'apiKey' ? '********' : value}`));
  });

// ==================== STATUS ====================
program
  .command('status')
  .description('Check LedgerMind API connection status')
  .action(async () => {
    const spinner = ora('Checking API connection...').start();
    const api = getApiClient();
    const apiUrl = config.get('apiUrl') as string || 'http://localhost:3000';

    try {
      // Health endpoint is public, doesn't need /api prefix
      const [health, analytics] = await Promise.all([
        axios.get(`${apiUrl}/health`),
        api.get('/analytics/overview').catch(() => ({ data: null }))
      ]);

      spinner.succeed('Connected to LedgerMind API');

      const stats = analytics.data;
      if (stats) {
        console.log(boxen(
          chalk.hex('#FF6600').bold('LedgerMind Status\n\n') +
          chalk.gray('API Status: ') + chalk.green('● Online') + '\n' +
          chalk.gray('Total Traces: ') + chalk.white(stats.total_traces || stats.totalTraces || 0) + '\n' +
          chalk.gray('Total Events: ') + chalk.white(stats.total_events || stats.totalEvents || 0) + '\n' +
          chalk.gray('Total Overrides: ') + chalk.white(stats.total_overrides || stats.totalOverrides || 0) + '\n' +
          chalk.gray('Active Policies: ') + chalk.white(stats.total_policies || stats.totalPolicies || 0),
          { padding: 1, margin: 1, borderColor: '#FF6600', borderStyle: 'round' }
        ));
      }
    } catch (error: any) {
      spinner.fail('Failed to connect to API');
      console.log(chalk.red(`\nError: ${error.message}`));
      console.log(chalk.gray('\nMake sure the API is running:'));
      console.log(chalk.cyan('  cd services/api && npm run dev'));
    }
  });

// ==================== TRACES ====================
const traces = program.command('traces').description('Manage decision traces');

traces
  .command('list')
  .description('List recent traces')
  .option('-l, --limit <number>', 'Number of traces to show', '10')
  .action(async (options) => {
    const spinner = ora('Fetching traces...').start();
    const api = getApiClient();

    try {
      const { data } = await api.get(`/traces?limit=${options.limit}`);
      spinner.stop();

      if (data.length === 0) {
        console.log(chalk.yellow('\nNo traces found. Run some agents to see their decision history.'));
        return;
      }

      const table = new Table({
        head: [
          chalk.hex('#FF6600')('ID'),
          chalk.hex('#FF6600')('Workflow'),
          chalk.hex('#FF6600')('Outcome'),
          chalk.hex('#FF6600')('Events'),
          chalk.hex('#FF6600')('Started')
        ],
        style: { head: [], border: [] }
      });

      data.forEach((trace: any) => {
        const eventCount = trace.events_summary?.length || trace.event_count || 0;
        const outcome = trace.final_outcome || trace.status || '-';
        table.push([
          truncate(trace.trace_id || trace.id, 20),
          trace.workflow_name || '-',
          outcome === 'approved' ? chalk.green(outcome) : 
            outcome === 'rejected' ? chalk.red(outcome) : chalk.yellow(outcome),
          eventCount,
          formatTime(trace.started_at || trace.created_at)
        ]);
      });

      console.log('\n' + table.toString());
      console.log(chalk.gray(`\nShowing ${data.length} traces. Use 'ledgermind traces view <id>' for details.`));
    } catch (error: any) {
      spinner.fail('Failed to fetch traces');
      console.log(chalk.red(error.message));
    }
  });

traces
  .command('view <traceId>')
  .description('View trace details with events')
  .action(async (traceId) => {
    const spinner = ora('Fetching trace details...').start();
    const api = getApiClient();

    try {
      const { data: trace } = await api.get(`/traces/${traceId}`);
      spinner.stop();

      const outcome = trace.final_outcome || trace.status || '-';
      console.log(boxen(
        chalk.hex('#FF6600').bold(`Trace: ${trace.trace_id || trace.id}\n\n`) +
        chalk.gray('Workflow: ') + chalk.white(trace.workflow_name || '-') + '\n' +
        chalk.gray('Outcome: ') + (outcome === 'approved' ? chalk.green(outcome) : 
          outcome === 'rejected' ? chalk.red(outcome) : chalk.yellow(outcome)) + '\n' +
        chalk.gray('Started: ') + chalk.white(formatTime(trace.started_at || trace.created_at)) + '\n' +
        chalk.gray('Ended: ') + chalk.white(formatTime(trace.ended_at || '-')),
        { padding: 1, margin: 1, borderColor: '#FF6600', borderStyle: 'round' }
      ));

      // Events are embedded in trace as events_summary
      const events = trace.events_summary || [];
      
      if (events && events.length > 0) {
        console.log(chalk.hex('#FF6600').bold('\nDecision Events:\n'));
        
        const table = new Table({
          head: [
            chalk.hex('#FF6600')('Agent'),
            chalk.hex('#FF6600')('Type'),
            chalk.hex('#FF6600')('Outcome'),
            chalk.hex('#FF6600')('Confidence'),
            chalk.hex('#FF6600')('Time')
          ],
          style: { head: [], border: [] },
          colWidths: [20, 15, 12, 12, 22]
        });

        events.forEach((event: any) => {
          table.push([
            event.actor_name || '-',
            event.event_type || '-',
            event.outcome || '-',
            event.confidence ? `${(event.confidence * 100).toFixed(0)}%` : '-',
            formatTime(event.timestamp)
          ]);
        });

        console.log(table.toString());
      } else {
        console.log(chalk.yellow('\nNo events recorded for this trace.'));
      }
    } catch (error: any) {
      spinner.fail('Failed to fetch trace');
      console.log(chalk.red(error.message));
    }
  });

traces
  .command('search <query>')
  .description('Search traces by content')
  .action(async (query) => {
    const spinner = ora('Searching traces...').start();
    const api = getApiClient();

    try {
      const { data } = await api.get(`/traces/search?q=${encodeURIComponent(query)}`);
      spinner.stop();

      if (!data || data.length === 0) {
        console.log(chalk.yellow(`\nNo traces found matching "${query}"`));
        return;
      }

      const table = new Table({
        head: [
          chalk.hex('#FF6600')('ID'),
          chalk.hex('#FF6600')('Agent'),
          chalk.hex('#FF6600')('Status'),
          chalk.hex('#FF6600')('Created')
        ],
        style: { head: [], border: [] }
      });

      data.forEach((trace: any) => {
        table.push([
          truncate(trace.id, 12),
          trace.agent_id || trace.agentId || '-',
          trace.status === 'completed' ? chalk.green(trace.status) : chalk.yellow(trace.status),
          formatTime(trace.created_at || trace.createdAt)
        ]);
      });

      console.log('\n' + table.toString());
    } catch (error: any) {
      spinner.fail('Search failed');
      console.log(chalk.red(error.message));
    }
  });

// ==================== POLICIES ====================
const policies = program.command('policies').description('Manage decision policies');

policies
  .command('list')
  .description('List all policies')
  .action(async () => {
    const spinner = ora('Fetching policies...').start();
    const api = getApiClient();

    try {
      const { data } = await api.get('/policies');
      spinner.stop();

      if (!data || data.length === 0) {
        console.log(chalk.yellow('\nNo policies found. Create one with: ledgermind policies create'));
        return;
      }

      const table = new Table({
        head: [
          chalk.hex('#FF6600')('ID'),
          chalk.hex('#FF6600')('Policy Name'),
          chalk.hex('#FF6600')('Version'),
          chalk.hex('#FF6600')('Created'),
          chalk.hex('#FF6600')('Status')
        ],
        style: { head: [], border: [] }
      });

      data.forEach((policy: any) => {
        table.push([
          truncate(policy.policy_version_id, 20),
          truncate(policy.policy_name, 25),
          policy.version || '1',
          policy.created_at ? new Date(policy.created_at).toLocaleDateString() : '-',
          policy.deprecated_at ? chalk.red('Deprecated') : chalk.green('Active')
        ]);
      });

      console.log('\n' + table.toString());
    } catch (error: any) {
      spinner.fail('Failed to fetch policies');
      console.log(chalk.red(error.message));
    }
  });

policies
  .command('create')
  .description('Create a new policy interactively')
  .action(async () => {
    console.log(chalk.hex('#FF6600').bold('\n📋 Create New Policy\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'policy_name',
        message: 'Policy name:',
        validate: (input: string) => input.length > 0 || 'Name is required'
      },
      {
        type: 'list',
        name: 'type',
        message: 'Policy type:',
        choices: [
          { name: 'Threshold - Require human approval above amount', value: 'threshold' },
          { name: 'Confidence - Require approval below confidence', value: 'confidence' },
          { name: 'Pattern - Match specific patterns', value: 'pattern' },
          { name: 'Custom - Custom rule logic', value: 'custom' }
        ]
      },
      {
        type: 'number',
        name: 'threshold',
        message: 'Threshold value (e.g., 10000 for $10k):',
        when: (ans: any) => ans.type === 'threshold',
        default: 10000
      },
      {
        type: 'number',
        name: 'minConfidence',
        message: 'Minimum confidence (0-1):',
        when: (ans: any) => ans.type === 'confidence',
        default: 0.7
      },
      {
        type: 'input',
        name: 'pattern',
        message: 'Pattern to match:',
        when: (ans: any) => ans.type === 'pattern'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description (optional):',
        default: ''
      }
    ]);

    const spinner = ora('Creating policy...').start();
    const api = getApiClient();

    try {
      const policy = {
        policy_name: answers.policy_name,
        version: 1,
        content: {
          type: answers.type,
          rules: answers.type === 'threshold' 
            ? [{ max_amount: answers.threshold, require_approval: true }]
            : answers.type === 'confidence'
            ? [{ min_confidence: answers.minConfidence, require_review: true }]
            : answers.type === 'pattern'
            ? [{ pattern: answers.pattern, action: 'flag' }]
            : [],
          description: answers.description
        },
        metadata: { created_via: 'cli' }
      };

      const { data } = await api.post('/policies', policy);
      spinner.succeed('Policy created!');

      console.log(boxen(
        chalk.green('✓ Policy Created\n\n') +
        chalk.gray('ID: ') + chalk.white(data.policy_version_id) + '\n' +
        chalk.gray('Name: ') + chalk.white(data.policy_name) + '\n' +
        chalk.gray('Version: ') + chalk.white(data.version) + '\n' +
        chalk.gray('Type: ') + chalk.white(answers.type),
        { padding: 1, margin: 1, borderColor: 'green', borderStyle: 'round' }
      ));
    } catch (error: any) {
      spinner.fail('Failed to create policy');
      console.log(chalk.red(error.response?.data?.error || error.message));
    }
  });

policies
  .command('toggle <policyId>')
  .description('Toggle policy active status')
  .action(async (policyId) => {
    const spinner = ora('Updating policy...').start();
    const api = getApiClient();

    try {
      // Get current policy
      const { data: current } = await api.get(`/policies/${policyId}`);
      const newStatus = !current.active;

      await api.patch(`/policies/${policyId}`, { active: newStatus });
      spinner.succeed(`Policy ${newStatus ? 'activated' : 'deactivated'}`);

      console.log(chalk.gray(`\nPolicy "${current.name}" is now `) + 
        (newStatus ? chalk.green('active') : chalk.red('inactive')));
    } catch (error: any) {
      spinner.fail('Failed to update policy');
      console.log(chalk.red(error.message));
    }
  });

// ==================== OVERRIDES ====================
const overrides = program.command('overrides').description('Manage human overrides');

overrides
  .command('list')
  .description('List recent human overrides')
  .option('-l, --limit <number>', 'Number of overrides to show', '10')
  .action(async (options) => {
    const spinner = ora('Fetching overrides...').start();
    const api = getApiClient();

    try {
      const { data } = await api.get(`/overrides?limit=${options.limit}`);
      spinner.stop();

      if (!data || data.length === 0) {
        console.log(chalk.yellow('\nNo overrides recorded yet.'));
        return;
      }

      const table = new Table({
        head: [
          chalk.hex('#FF6600')('Override ID'),
          chalk.hex('#FF6600')('Reviewer'),
          chalk.hex('#FF6600')('Original'),
          chalk.hex('#FF6600')('New Outcome'),
          chalk.hex('#FF6600')('Reason'),
          chalk.hex('#FF6600')('Time')
        ],
        style: { head: [], border: [] }
      });

      data.forEach((override: any) => {
        table.push([
          truncate(override.override_id, 12),
          override.actor_name || '-',
          chalk.red(override.original_outcome || '-'),
          chalk.green(override.new_outcome || '-'),
          truncate(override.reason || '-', 30),
          formatTime(override.timestamp)
        ]);
      });

      console.log('\n' + table.toString());
    } catch (error: any) {
      spinner.fail('Failed to fetch overrides');
      console.log(chalk.red(error.message));
    }
  });

overrides
  .command('record')
  .description('Record a new human override interactively')
  .action(async () => {
    console.log(chalk.hex('#FF6600').bold('\n✏️  Record Human Override\n'));

    const api = getApiClient();

    // First, get recent events to choose from
    const spinner = ora('Fetching recent events...').start();
    let events: any[] = [];
    
    try {
      const { data: traces } = await api.get('/traces?limit=5');
      for (const trace of traces) {
        const { data: traceEvents } = await api.get(`/traces/${trace.id}/events`);
        events.push(...traceEvents.slice(0, 3));
      }
      spinner.stop();
    } catch (error) {
      spinner.fail('Failed to fetch events');
      return;
    }

    if (events.length === 0) {
      console.log(chalk.yellow('No events found. Run some agents first.'));
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'eventId',
        message: 'Select event to override:',
        choices: events.map(e => ({
          name: `${truncate(e.event_type || e.eventType, 15)} | ${truncate(JSON.stringify(e.output), 30)} (${truncate(e.id, 8)})`,
          value: e.id
        }))
      },
      {
        type: 'input',
        name: 'overrideOutput',
        message: 'New output value (JSON or text):',
        validate: (input: string) => input.length > 0 || 'Override value is required'
      },
      {
        type: 'input',
        name: 'reason',
        message: 'Reason for override:',
        default: ''
      },
      {
        type: 'input',
        name: 'userId',
        message: 'Your user ID:',
        default: config.get('userId') || 'cli-user'
      }
    ]);

    // Save user ID for future
    config.set('userId', answers.userId);

    const saveSpinner = ora('Recording override...').start();

    try {
      // Parse override output as JSON if possible
      let overrideOutput = answers.overrideOutput;
      try {
        overrideOutput = JSON.parse(answers.overrideOutput);
      } catch {
        // Keep as string
      }

      const { data } = await api.post('/overrides', {
        event_id: answers.eventId,
        override_output: overrideOutput,
        reason: answers.reason,
        user_id: answers.userId
      });

      saveSpinner.succeed('Override recorded!');

      console.log(boxen(
        chalk.green('✓ Override Recorded\n\n') +
        chalk.gray('Override ID: ') + chalk.white(data.id) + '\n' +
        chalk.gray('Event ID: ') + chalk.white(answers.eventId) + '\n' +
        chalk.gray('By: ') + chalk.white(answers.userId),
        { padding: 1, margin: 1, borderColor: 'green', borderStyle: 'round' }
      ));
    } catch (error: any) {
      saveSpinner.fail('Failed to record override');
      console.log(chalk.red(error.response?.data?.error || error.message));
    }
  });

// ==================== SIMILAR ====================
program
  .command('similar <query>')
  .description('Find similar past decisions using AI')
  .option('-l, --limit <number>', 'Number of results', '5')
  .action(async (query, options) => {
    const spinner = ora('Searching for similar decisions...').start();
    const api = getApiClient();

    try {
      const { data } = await api.post('/similarity/query', {
        input_context: query,
        limit: parseInt(options.limit)
      });

      spinner.stop();

      if (!data || !data.cases || data.cases.length === 0) {
        console.log(chalk.yellow(`\nNo similar decisions found for: "${query}"`));
        console.log(chalk.gray('Try a different query or ensure you have decision history with embeddings.'));
        return;
      }

      console.log(chalk.hex('#FF6600').bold(`\n🔍 Similar Decisions for: "${query}"\n`));
      console.log(chalk.gray(`Found ${data.total_found} similar cases | Avg confidence: ${(data.avg_confidence * 100).toFixed(0)}% | Override rate: ${data.override_rate.toFixed(0)}%\n`));

      data.cases.forEach((result: any, index: number) => {
        const similarity = result.similarity ? `${(result.similarity * 100).toFixed(1)}%` : '-';

        console.log(boxen(
          chalk.hex('#FF6600').bold(`#${index + 1}`) + chalk.gray(` (${similarity} match)\n\n`) +
          chalk.gray('Decision Type: ') + chalk.white(result.decision_type || '-') + '\n' +
          chalk.gray('Outcome: ') + chalk.white(result.outcome || '-') + '\n' +
          chalk.gray('Confidence: ') + chalk.white(result.confidence ? `${(result.confidence * 100).toFixed(0)}%` : '-') + '\n' +
          chalk.gray('Overridden: ') + (result.was_overridden ? chalk.red('Yes') : chalk.green('No')),
          { padding: 1, borderStyle: 'round', borderColor: 'gray' }
        ));
      });
    } catch (error: any) {
      spinner.fail('Search failed');
      if (error.response?.status === 500 && error.response?.data?.error?.includes('OPENAI')) {
        console.log(chalk.yellow('\nAI search requires OpenAI API key.'));
        console.log(chalk.gray('Set OPENAI_API_KEY environment variable.'));
      } else {
        console.log(chalk.red(error.response?.data?.error || error.message));
      }
    }
  });

// ==================== EXPLAIN ====================
program
  .command('explain <traceId>')
  .description('Get AI explanation of a decision trace')
  .action(async (traceId) => {
    const spinner = ora('Analyzing decision trace...').start();
    const api = getApiClient();

    try {
      const { data } = await api.post('/ai/explain', { trace_id: traceId });
      spinner.stop();

      console.log(boxen(
        chalk.hex('#FF6600').bold('🤖 AI Explanation\n\n') +
        chalk.white(data.explanation || data.result || 'No explanation available'),
        { padding: 1, margin: 1, borderColor: '#FF6600', borderStyle: 'round' }
      ));
    } catch (error: any) {
      spinner.fail('Explanation failed');
      console.log(chalk.red(error.response?.data?.error || error.message));
    }
  });

// ==================== DASHBOARD ====================
program
  .command('dashboard')
  .description('Open the LedgerMind dashboard in browser')
  .action(async () => {
    const dashboardUrl = config.get('dashboardUrl') as string || 'http://localhost:3001';
    console.log(chalk.hex('#FF6600')(`\n🚀 Opening dashboard at ${dashboardUrl}...\n`));
    
    try {
      await open(dashboardUrl);
      console.log(chalk.gray('Dashboard opened in your default browser.'));
    } catch (error) {
      console.log(chalk.yellow(`Could not open browser automatically.`));
      console.log(chalk.gray(`Visit: ${dashboardUrl}`));
    }
  });

// ==================== AI: PATTERNS ====================
program
  .command('patterns')
  .description('AI-powered pattern detection in recent decisions')
  .option('-l, --limit <number>', 'Number of decisions to analyze', '100')
  .action(async (options) => {
    const spinner = ora('Analyzing decision patterns with AI...').start();
    const api = getApiClient();

    try {
      const { data } = await api.post('/ai/patterns', {
        limit: parseInt(options.limit)
      });

      spinner.stop();

      console.log(boxen(
        chalk.hex('#FF6600').bold('🔍 AI Pattern Analysis\n\n') +
        chalk.bold('Patterns Found:\n') +
        (data.patterns || []).map((p: any) => 
          `  ${p.severity === 'high' ? chalk.red('🔴') : p.severity === 'medium' ? chalk.yellow('🟡') : chalk.green('🟢')} [${p.type}] ${p.description}${p.affectedAgent ? ` (${p.affectedAgent})` : ''}`
        ).join('\n') + '\n\n' +
        chalk.bold('Insights:\n') +
        (data.insights || []).map((i: string) => `  • ${i}`).join('\n') + '\n\n' +
        (data.alerts?.length ? chalk.bold.red('⚠️  Alerts:\n') + data.alerts.map((a: any) => `  • ${typeof a === 'string' ? a : a.message || JSON.stringify(a)}`).join('\n') : chalk.green('✓ No alerts')),
        { padding: 1, margin: 1, borderColor: '#FF6600', borderStyle: 'round' }
      ));
    } catch (error: any) {
      spinner.fail('Pattern analysis failed');
      if (error.response?.status === 500 && error.response?.data?.error?.includes('OPENAI')) {
        console.log(chalk.yellow('\nAI features require OpenAI API key.'));
        console.log(chalk.gray('Set OPENAI_API_KEY environment variable in services/api/.env'));
      } else {
        console.log(chalk.red(error.response?.data?.error || error.message));
      }
    }
  });

// ==================== AI: AUDIT ====================
program
  .command('audit')
  .description('Generate AI-powered compliance audit report')
  .option('-s, --start <date>', 'Start date (YYYY-MM-DD)')
  .option('-e, --end <date>', 'End date (YYYY-MM-DD)')
  .action(async (options) => {
    const endDate = options.end || new Date().toISOString().split('T')[0];
    const startDate = options.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const spinner = ora('Generating AI audit report...').start();
    const api = getApiClient();

    try {
      const { data: report } = await api.post('/ai/audit-report', {
        period_start: startDate,
        period_end: endDate
      });

      spinner.stop();

      const statusColor = report.complianceStatus === 'compliant' ? 'green' : 
                          report.complianceStatus === 'needs_review' ? 'yellow' : 'red';
      const statusIcon = report.complianceStatus === 'compliant' ? '✅' : 
                         report.complianceStatus === 'needs_review' ? '⚠️' : '❌';

      console.log(boxen(
        chalk.hex('#FF6600').bold('📋 AI AUDIT REPORT\n') +
        chalk.gray(`Period: ${startDate} to ${endDate}\n\n`) +
        chalk.bold('Status: ') + chalk[statusColor](`${statusIcon} ${(report.complianceStatus || 'unknown').toUpperCase()}\n\n`) +
        chalk.bold('Executive Summary:\n') +
        chalk.white(`  ${report.executiveSummary || 'No summary available'}\n\n`) +
        chalk.bold('Key Findings:\n') +
        (report.findings || []).map((f: any) => `  ✓ ${typeof f === 'string' ? f : f.finding || JSON.stringify(f)}`).join('\n') + '\n\n' +
        (report.concerns?.length ? 
          chalk.bold.yellow('Concerns:\n') + report.concerns.map((c: any) => `  ⚠ ${typeof c === 'string' ? c : c.concern || JSON.stringify(c)}`).join('\n') + '\n\n' : '') +
        chalk.bold('Recommendations:\n') +
        (report.recommendations || []).map((r: any) => `  → ${typeof r === 'string' ? r : r.recommendation || JSON.stringify(r)}`).join('\n'),
        { padding: 1, margin: 1, borderColor: '#FF6600', borderStyle: 'round', title: 'LedgerMind Audit', titleAlignment: 'center' }
      ));
    } catch (error: any) {
      spinner.fail('Audit report generation failed');
      console.log(chalk.red(error.response?.data?.error || error.message));
    }
  });

// ==================== AI: ASK ====================
program
  .command('ask <question>')
  .description('Ask questions in natural language')
  .action(async (question) => {
    const spinner = ora('Understanding your question...').start();
    const api = getApiClient();

    try {
      // Parse the natural language query
      const { data: parsed } = await api.post('/ai/parse-query', { query: question });

      spinner.text = 'Fetching relevant data...';

      // Determine what data to fetch based on parsed query
      let resultData: any;
      const filters = parsed.filters || {};

      if (filters.workflowName || filters.outcome) {
        // Query traces
        const { data: traces } = await api.get('/traces', { params: { limit: 10 } });
        resultData = { type: 'traces', data: traces };
      } else if (filters.agentName) {
        // Query analytics by agent
        const { data: agents } = await api.get('/analytics/agents');
        resultData = { type: 'agents', data: agents };
      } else {
        // Default to overview
        const { data: overview } = await api.get('/analytics/overview');
        resultData = { type: 'overview', data: overview };
      }

      spinner.stop();

      console.log(boxen(
        chalk.hex('#FF6600').bold('🤖 AI Answer\n\n') +
        chalk.gray(`Query: "${question}"\n`) +
        chalk.gray(`Interpretation: ${parsed.interpretation}\n\n`) +
        chalk.bold('Results:\n') +
        chalk.white(JSON.stringify(resultData.data, null, 2).substring(0, 500) + 
          (JSON.stringify(resultData.data).length > 500 ? '...' : '')),
        { padding: 1, margin: 1, borderColor: '#FF6600', borderStyle: 'round' }
      ));
    } catch (error: any) {
      spinner.fail('Query failed');
      console.log(chalk.red(error.response?.data?.error || error.message));
    }
  });

// ==================== AI: RECOMMEND ====================
program
  .command('recommend')
  .description('Get AI recommendation for a decision (interactive)')
  .action(async () => {
    console.log(chalk.hex('#FF6600').bold('\n🤖 AI Decision Recommendation\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'agentName',
        message: 'Agent name:',
        default: 'DecisionAgent'
      },
      {
        type: 'input',
        name: 'input',
        message: 'Decision input (JSON):',
        default: '{"amount": 5000, "risk": "medium"}'
      },
      {
        type: 'input',
        name: 'output',
        message: 'Proposed output (JSON):',
        default: '{"approved": true}'
      },
      {
        type: 'number',
        name: 'confidence',
        message: 'Confidence (0-1):',
        default: 0.75
      }
    ]);

    const spinner = ora('Getting AI recommendation...').start();
    const api = getApiClient();

    try {
      let inputObj, outputObj;
      try {
        inputObj = JSON.parse(answers.input);
        outputObj = JSON.parse(answers.output);
      } catch {
        spinner.fail('Invalid JSON in input or output');
        return;
      }

      const { data } = await api.post('/ai/recommend', {
        agent_name: answers.agentName,
        input: inputObj,
        proposed_output: outputObj,
        confidence: answers.confidence
      });

      spinner.stop();

      const recColor = data.recommendation === 'proceed' ? 'green' : 
                       data.recommendation === 'review' ? 'yellow' : 'red';
      const recIcon = data.recommendation === 'proceed' ? '✅' : 
                      data.recommendation === 'review' ? '⚠️' : '❌';

      console.log(boxen(
        chalk.hex('#FF6600').bold('🎯 AI Recommendation\n\n') +
        chalk.bold('Decision: ') + chalk[recColor](`${recIcon} ${data.recommendation?.toUpperCase()}\n\n`) +
        chalk.gray('Original Confidence: ') + chalk.white(`${(answers.confidence * 100).toFixed(0)}%\n`) +
        chalk.gray('Adjusted Confidence: ') + chalk.white(`${(data.adjustedConfidence * 100).toFixed(0)}%\n\n`) +
        chalk.bold('Reasoning:\n') +
        chalk.white(`  ${data.reasoning}\n\n`) +
        (data.warnings?.length ?
          chalk.bold.yellow('Warnings:\n') + data.warnings.map((w: string) => `  ⚠ ${w}`).join('\n') + '\n\n' : '') +
        chalk.gray(`Based on ${data.similarCasesCount || 0} similar past cases`),
        { padding: 1, margin: 1, borderColor: recColor, borderStyle: 'round' }
      ));
    } catch (error: any) {
      spinner.fail('Recommendation failed');
      console.log(chalk.red(error.response?.data?.error || error.message));
    }
  });

// ==================== QUICKSTART ====================
program
  .command('quickstart')
  .description('Show quickstart guide')
  .action(() => {
    console.log(chalk.hex('#FF6600')(logo));
    
    console.log(boxen(
      chalk.hex('#FF6600').bold('🚀 LedgerMind Quickstart\n\n') +
      chalk.white('1. Start the API server:\n') +
      chalk.cyan('   cd services/api && npm run dev\n\n') +
      chalk.white('2. Start the dashboard (optional):\n') +
      chalk.cyan('   cd dashboard && npm run dev\n\n') +
      chalk.white('3. Initialize the CLI:\n') +
      chalk.cyan('   ledgermind init\n\n') +
      chalk.white('4. Check status:\n') +
      chalk.cyan('   ledgermind status\n\n') +
      chalk.white('5. Run an example agent:\n') +
      chalk.cyan('   cd examples && npx ts-node invoice-approval.ts\n\n') +
      chalk.white('6. View traces:\n') +
      chalk.cyan('   ledgermind traces list\n\n') +
      chalk.white('7. AI Features:\n') +
      chalk.cyan('   ledgermind patterns   # Detect patterns\n') +
      chalk.cyan('   ledgermind audit      # Generate audit report\n') +
      chalk.cyan('   ledgermind recommend  # Get AI recommendation\n') +
      chalk.cyan('   ledgermind ask "..."  # Natural language query\n'),
      { padding: 1, margin: 1, borderColor: '#FF6600', borderStyle: 'double' }
    ));

    console.log(chalk.gray('\nFor more commands, run: ledgermind --help'));
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.hex('#FF6600')(logo));
  console.log(chalk.gray('Decision Intelligence for AI Systems\n'));
  program.outputHelp();
}
