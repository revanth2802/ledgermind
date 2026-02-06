"""
LedgerMind Python Client
========================

A simple Python client for integrating any AI agent with LedgerMind.

Installation:
    pip install requests

Usage:
    from ledgermind import LedgerMindClient
    
    client = LedgerMindClient(api_key="your-api-key")
    
    # Log a decision
    client.log_decision(
        trace_id="order-123",
        agent_name="FraudAgent",
        outcome="approved",
        confidence=0.95,
        reasoning="Low risk customer"
    )
"""

import requests
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid


class LedgerMindClient:
    """
    Python client for LedgerMind Decision Memory API.
    
    Works with any AI agent - just import and use!
    """
    
    def __init__(
        self, 
        api_key: str, 
        base_url: str = "http://localhost:3000",
        tenant_id: Optional[str] = None
    ):
        """
        Initialize the LedgerMind client.
        
        Args:
            api_key: Your LedgerMind API key
            base_url: API base URL (default: localhost for dev)
            tenant_id: Optional tenant ID for multi-tenant setups
        """
        self.base_url = base_url.rstrip('/')
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        if tenant_id:
            self.headers["x-tenant-id"] = tenant_id
    
    def _request(self, method: str, endpoint: str, data: Dict = None) -> Dict:
        """Make an API request."""
        url = f"{self.base_url}/api{endpoint}"
        response = requests.request(method, url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json() if response.text else {}
    
    # =========================================================================
    # TRACES - Track complete decision workflows
    # =========================================================================
    
    def start_trace(
        self, 
        workflow_name: str, 
        metadata: Optional[Dict] = None
    ) -> str:
        """
        Start a new decision trace.
        
        Args:
            workflow_name: Name of the workflow (e.g., "loan_approval")
            metadata: Optional metadata dict
            
        Returns:
            trace_id: Unique identifier for this trace
        """
        trace_id = f"trace_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:8]}"
        
        self._request("POST", "/traces", {
            "trace_id": trace_id,
            "workflow_name": workflow_name,
            "metadata": metadata or {}
        })
        
        return trace_id
    
    def end_trace(self, trace_id: str, final_outcome: str) -> None:
        """
        Complete a trace with the final outcome.
        
        Args:
            trace_id: The trace to complete
            final_outcome: Final decision (approved/rejected/escalated/etc)
        """
        self._request("PATCH", f"/traces/{trace_id}", {
            "final_outcome": final_outcome
        })
    
    def get_traces(self, limit: int = 50, workflow_name: Optional[str] = None) -> List[Dict]:
        """Get recent traces."""
        params = f"?limit={limit}"
        if workflow_name:
            params += f"&workflow_name={workflow_name}"
        return self._request("GET", f"/traces{params}")
    
    # =========================================================================
    # DECISIONS - Log individual agent decisions
    # =========================================================================
    
    def log_decision(
        self,
        trace_id: str,
        agent_name: str,
        outcome: str,
        confidence: float,
        reasoning: str,
        input_data: Optional[Dict] = None,
        output_data: Optional[Dict] = None,
        policy_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Log an AI agent decision.
        
        Args:
            trace_id: The trace this decision belongs to
            agent_name: Name of the agent making the decision
            outcome: Decision result (approved/rejected/escalated/pending/error)
            confidence: Confidence score 0.0-1.0
            reasoning: Human-readable explanation
            input_data: What the agent received
            output_data: What the agent produced
            policy_id: Optional policy that guided this decision
            metadata: Additional context
            
        Returns:
            The created event
        """
        step_id = f"step_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:8]}"
        
        return self._request("POST", "/events", {
            "trace_id": trace_id,
            "step_id": step_id,
            "actor_type": "agent",
            "actor_name": agent_name,
            "event_type": "decision_made",
            "outcome": outcome,
            "confidence": confidence,
            "reasoning": reasoning,
            "input_summary": input_data or {},
            "output_summary": output_data or {},
            "policy_version_id": policy_id,
            "metadata": metadata or {}
        })
    
    # =========================================================================
    # SIMILARITY - Find similar past decisions
    # =========================================================================
    
    def find_similar(
        self, 
        context: str, 
        limit: int = 5,
        min_similarity: float = 0.7,
        workflow_name: Optional[str] = None
    ) -> List[Dict]:
        """
        Find similar past decisions using semantic search.
        
        Args:
            context: Description of the current situation
            limit: Max results to return
            min_similarity: Minimum similarity threshold (0-1)
            workflow_name: Optional filter by workflow
            
        Returns:
            List of similar past decisions with similarity scores
        """
        return self._request("POST", "/similarity/query", {
            "input_context": context,
            "limit": limit,
            "min_similarity": min_similarity,
            "workflow_name": workflow_name
        })
    
    # =========================================================================
    # AI FEATURES - Intelligence layer
    # =========================================================================
    
    def get_recommendation(self, context: str, workflow_name: Optional[str] = None) -> Dict:
        """
        Get AI recommendation for a decision.
        
        Args:
            context: Current situation description
            workflow_name: Optional workflow filter
            
        Returns:
            Recommendation with reasoning and similar cases
        """
        return self._request("POST", "/ai/recommend", {
            "context": context,
            "workflow_name": workflow_name
        })
    
    def detect_patterns(self, days: int = 7) -> Dict:
        """Detect patterns in recent decisions."""
        return self._request("GET", f"/ai/patterns?days={days}")
    
    def generate_audit_report(self, days: int = 30) -> Dict:
        """Generate a compliance audit report."""
        return self._request("GET", f"/ai/audit-report?days={days}")
    
    def ask(self, question: str) -> Dict:
        """
        Ask a natural language question about decisions.
        
        Args:
            question: Plain English question
            
        Returns:
            Answer with supporting data
        """
        return self._request("POST", "/ai/parse-query", {
            "query": question
        })
    
    # =========================================================================
    # POLICIES - Manage decision policies
    # =========================================================================
    
    def get_policies(self) -> List[Dict]:
        """Get all active policies."""
        return self._request("GET", "/policies")
    
    def create_policy(
        self,
        name: str,
        rules: Dict,
        version: int = 1,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Create a new policy.
        
        Args:
            name: Policy name
            rules: Policy rules configuration
            version: Version number
            metadata: Additional metadata
        """
        return self._request("POST", "/policies", {
            "policy_name": name,
            "version": version,
            "content": rules,
            "metadata": metadata or {}
        })
    
    # =========================================================================
    # OVERRIDES - Human corrections
    # =========================================================================
    
    def record_override(
        self,
        event_id: str,
        trace_id: str,
        reviewer_name: str,
        new_outcome: str,
        reason: str
    ) -> Dict:
        """
        Record a human override of an AI decision.
        
        Args:
            event_id: The original decision event ID
            trace_id: The trace containing the decision
            reviewer_name: Who made the override
            new_outcome: The corrected outcome
            reason: Why the override was made
        """
        return self._request("POST", "/overrides", {
            "original_event_id": event_id,
            "trace_id": trace_id,
            "actor_name": reviewer_name,
            "new_outcome": new_outcome,
            "reason": reason
        })
    
    def get_overrides(self, limit: int = 50) -> List[Dict]:
        """Get recent human overrides."""
        return self._request("GET", f"/overrides?limit={limit}")
    
    def get_override_rate(self, workflow_name: Optional[str] = None) -> float:
        """Get the override rate (% of decisions corrected by humans)."""
        params = f"?workflow_name={workflow_name}" if workflow_name else ""
        result = self._request("GET", f"/overrides/rate{params}")
        return result.get("override_rate", 0)


# =============================================================================
# DECORATOR - Wrap any function to auto-log decisions
# =============================================================================

def track_decision(client: LedgerMindClient, agent_name: str, workflow_name: str):
    """
    Decorator to automatically track decisions from any function.
    
    Usage:
        @track_decision(client, "MyAgent", "my_workflow")
        def my_decision_function(input_data):
            # Your AI logic
            return {
                "outcome": "approved",
                "confidence": 0.95,
                "reasoning": "Looks good"
            }
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Start trace
            trace_id = client.start_trace(workflow_name)
            
            try:
                # Run the function
                result = func(*args, **kwargs)
                
                # Log the decision
                client.log_decision(
                    trace_id=trace_id,
                    agent_name=agent_name,
                    outcome=result.get("outcome", "pending"),
                    confidence=result.get("confidence", 0.5),
                    reasoning=result.get("reasoning", ""),
                    input_data={"args": str(args), "kwargs": str(kwargs)},
                    output_data=result
                )
                
                # Complete trace
                client.end_trace(trace_id, result.get("outcome", "pending"))
                
                return result
            except Exception as e:
                # Log error
                client.log_decision(
                    trace_id=trace_id,
                    agent_name=agent_name,
                    outcome="error",
                    confidence=0,
                    reasoning=str(e)
                )
                client.end_trace(trace_id, "error")
                raise
        
        return wrapper
    return decorator


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    # Initialize client
    client = LedgerMindClient(
        api_key="demo-key",
        base_url="http://localhost:3000",
        tenant_id="demo-tenant"
    )
    
    # Example 1: Manual logging
    print("=== Example 1: Manual Decision Logging ===")
    trace_id = client.start_trace("fraud_detection", {"channel": "web"})
    
    client.log_decision(
        trace_id=trace_id,
        agent_name="FraudDetectionAgent",
        outcome="approved",
        confidence=0.92,
        reasoning="Transaction matches normal spending pattern",
        input_data={"amount": 150, "merchant": "Amazon"},
        output_data={"risk_score": 0.08, "flags": []}
    )
    
    client.end_trace(trace_id, "approved")
    print(f"✓ Logged decision to trace: {trace_id}")
    
    # Example 2: Using the decorator
    print("\n=== Example 2: Using @track_decision Decorator ===")
    
    @track_decision(client, "LoanAgent", "loan_approval")
    def evaluate_loan(applicant: dict) -> dict:
        # Your AI logic here
        credit_score = applicant.get("credit_score", 650)
        
        if credit_score >= 700:
            return {
                "outcome": "approved",
                "confidence": 0.95,
                "reasoning": f"Excellent credit score: {credit_score}"
            }
        elif credit_score >= 600:
            return {
                "outcome": "escalated",
                "confidence": 0.7,
                "reasoning": f"Moderate credit score: {credit_score}, needs review"
            }
        else:
            return {
                "outcome": "rejected",
                "confidence": 0.9,
                "reasoning": f"Low credit score: {credit_score}"
            }
    
    result = evaluate_loan({"name": "John", "credit_score": 720})
    print(f"✓ Decision: {result['outcome']} (auto-logged!)")
    
    # Example 3: Find similar decisions
    print("\n=== Example 3: Find Similar Past Decisions ===")
    try:
        similar = client.find_similar(
            context="Customer requesting $500 refund for damaged electronics",
            limit=3
        )
        print(f"✓ Found {len(similar)} similar cases")
    except Exception as e:
        print(f"  (Similarity search requires vectors: {e})")
    
    # Example 4: Get AI recommendation
    print("\n=== Example 4: Get AI Recommendation ===")
    try:
        rec = client.get_recommendation("High-value transaction from new customer")
        print(f"✓ Recommendation: {rec}")
    except Exception as e:
        print(f"  (AI features require OpenAI key: {e})")
    
    print("\n✅ All examples completed!")
