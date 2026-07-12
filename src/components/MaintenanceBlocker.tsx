import React from "react";
import { AlertCircle } from "lucide-react";

export function MaintenanceBlockerUI() {
    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#09090b", color: "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
            <div style={{ maxWidth: "32rem", width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "1.5rem", padding: "3rem", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem" }}>
                    <AlertCircle style={{ width: "4rem", height: "4rem", color: "#ef4444", marginBottom: "1rem" }} />
                    <h1 style={{ fontSize: "1.5rem", fontWeight: "900", fontStyle: "italic", textTransform: "uppercase" }}>Mode Maintenance</h1>
                </div>
                <p style={{ fontSize: "1rem", color: "#a1a1aa", lineHeight: "1.5" }}>
                    Cette page est en maintenance, elle sera disponible d&apos;ici 24 h et une notification sera envoyée.
                </p>
                <div style={{ marginTop: "2rem" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>SmartResto System</p>
                </div>
            </div>
        </div>
    );
}
