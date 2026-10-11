class PolicyEngine:
    """
    PROLOG-inspired Declarative Policy Authorization Engine for Remediation Actions.
    Evaluates role permissions, risk levels, and resource sensitivity rules.
    """

    # Policy Rules Matrix: Role -> ActionType -> RiskLevel -> Decision
    POLICIES = {
        "Admin": {
            "SCALE_DEPLOYMENT": {"LOW": "ALLOW", "HIGH": "ALLOW"},
            "RESTART_POD": {"LOW": "ALLOW", "HIGH": "ALLOW"},
            "ROLLBACK_DEPLOYMENT": {"LOW": "ALLOW", "HIGH": "REQUIRE_APPROVAL"},
            "DELETE_RESOURCE": {"LOW": "REQUIRE_APPROVAL", "HIGH": "DENY"}
        },
        "DevOps": {
            "SCALE_DEPLOYMENT": {"LOW": "ALLOW", "HIGH": "REQUIRE_APPROVAL"},
            "RESTART_POD": {"LOW": "ALLOW", "HIGH": "REQUIRE_APPROVAL"},
            "ROLLBACK_DEPLOYMENT": {"LOW": "REQUIRE_APPROVAL", "HIGH": "REQUIRE_APPROVAL"},
            "DELETE_RESOURCE": {"LOW": "DENY", "HIGH": "DENY"}
        },
        "Developer": {
            "SCALE_DEPLOYMENT": {"LOW": "REQUIRE_APPROVAL", "HIGH": "DENY"},
            "RESTART_POD": {"LOW": "REQUIRE_APPROVAL", "HIGH": "DENY"},
            "ROLLBACK_DEPLOYMENT": {"LOW": "DENY", "HIGH": "DENY"},
            "DELETE_RESOURCE": {"LOW": "DENY", "HIGH": "DENY"}
        },
        "Viewer": {
            "SCALE_DEPLOYMENT": {"LOW": "DENY", "HIGH": "DENY"},
            "RESTART_POD": {"LOW": "DENY", "HIGH": "DENY"},
            "ROLLBACK_DEPLOYMENT": {"LOW": "DENY", "HIGH": "DENY"},
            "DELETE_RESOURCE": {"LOW": "DENY", "HIGH": "DENY"}
        }
    }

    def evaluate_action(
        self,
        user_role: str,
        action_type: str,
        risk_level: str,
        target_service: str
    ) -> dict:
        role = user_role or "DevOps"
        action = action_type.upper()
        risk = risk_level.upper()

        role_policies = self.POLICIES.get(role, self.POLICIES["Viewer"])
        action_policy = role_policies.get(action, {"LOW": "DENY", "HIGH": "DENY"})
        decision = action_policy.get(risk, "REQUIRE_APPROVAL")

        # Safety Override Rules
        if target_service.lower() in ["kube-system", "database-primary"] and action == "DELETE_RESOURCE":
            decision = "DENY"
            reason = "Production core infrastructure deletion strictly prohibited by policy rule."
        elif decision == "ALLOW":
            reason = f"Action '{action}' with risk level '{risk}' allowed for role '{role}'."
        elif decision == "REQUIRE_APPROVAL":
            reason = f"Action '{action}' requires explicit senior DevOps/Admin human approval."
        else:
            reason = f"Role '{role}' is unauthorized to perform action '{action}' under risk policy."

        return {
            "decision": decision,
            "policy_rule_matched": f"rule({role}, {action}, {risk}) -> {decision}",
            "reason": reason
        }
