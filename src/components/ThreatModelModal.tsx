import React from 'react';
import { Shield, Lock, Server, Database, Key, CheckCircle, X, AlertTriangle } from 'lucide-react';

interface ThreatModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThreatModelModal: React.FC<ThreatModelModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="threat-model-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C2C24]/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="threat-model-modal-content"
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#FDFCF9] rounded-2xl shadow-2xl border border-[#D9D7CE] overflow-hidden flex flex-col my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D9D7CE] bg-[#EDEBE4]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FDFCF9] text-[#5A5A40] border border-[#D9D7CE] rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#2C2C24]">Security Architecture & Agentic Threat Model</h2>
              <p className="text-xs text-[#706E64]">OWASP Top 10 + OWASP LLM Top 10 Compliance Analysis</p>
            </div>
          </div>
          <button
            id="close-threat-modal-button"
            onClick={onClose}
            className="p-1.5 text-[#706E64] hover:text-[#2C2C24] hover:bg-[#D9D7CE]/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#333333]">
          {/* Executive Summary */}
          <div className="p-4 bg-[#EDEBE4] border border-[#D9D7CE] rounded-xl text-[#2C2C24]">
            <h3 className="font-serif font-bold text-[#4A4A30] flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-[#5A5A40]" />
              Production Security Verification Status: Active
            </h3>
            <p className="text-xs leading-relaxed text-[#555550]">
              This application enforces zero-hardcoded secrets, server-side Gemini API proxying with an automatic 4-stage model fallback ladder, strict user-bound Firestore access rules (<code className="bg-[#FDFCF9] border border-[#D9D7CE] px-1 py-0.5 rounded font-mono text-[#4A4A30]">request.auth.uid == userId</code>), and zero custom password vulnerabilities via Federated Google Sign-In.
            </p>
          </div>

          {/* 5 Threat Zones Analysis Table */}
          <div>
            <h3 className="text-base font-serif font-bold text-[#2C2C24] mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#5A5A40]" />
              1. Five Threat Zones Mapping & Countermeasures
            </h3>
            <div className="border border-[#D9D7CE] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#EDEBE4] text-[#4A4A30] font-semibold border-b border-[#D9D7CE]">
                  <tr>
                    <th className="p-3 w-1/4">Threat Zone</th>
                    <th className="p-3 w-1/3">Identified Vulnerability Vectors</th>
                    <th className="p-3">Implemented Countermeasures & Defense</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEBE4]">
                  <tr className="hover:bg-[#EDEBE4]/40">
                    <td className="p-3 font-semibold text-[#2C2C24]">
                      1. Input Surfaces
                    </td>
                    <td className="p-3 text-[#555550]">
                      Malformed JSON payloads, oversized prompt bombs (DoS), injection payloads in reflection text, untrusted geolocation input, SSRF in autocomplete / geocode queries.
                    </td>
                    <td className="p-3 text-[#333333]">
                      Strict body validation before routing; body size capped to 1MB; strings clamped to strict character boundaries (e.g. 200 chars on place search queries); HTML-safe Markdown rendering. Geolocation strictly opt-in (never silent or background); server-side boundary validation on reverse-geocoding coordinates; autocomplete queries sanitized and rate-limited.
                    </td>
                  </tr>
                  <tr className="hover:bg-[#EDEBE4]/40">
                    <td className="p-3 font-semibold text-[#2C2C24]">
                      2. Planning & Reasoning
                    </td>
                    <td className="p-3 text-[#555550]">
                      LLM Jailbreak prompts attempting system override or confidential data extraction.
                    </td>
                    <td className="p-3 text-[#333333]">
                      Explicit system instructions with clear semantic boundaries, role isolation, and persona constraint headers.
                    </td>
                  </tr>
                  <tr className="hover:bg-[#EDEBE4]/40">
                    <td className="p-3 font-semibold text-[#2C2C24]">
                      3. Tool Execution & Escalation
                    </td>
                    <td className="p-3 text-[#555550]">
                      Unauthorized access to admin operations, unauthenticated API execution.
                    </td>
                    <td className="p-3 text-[#333333]">
                      Client-side API requests never execute arbitrary server tools; no elevated shell execution exposed to client endpoints.
                    </td>
                  </tr>
                  <tr className="hover:bg-[#EDEBE4]/40">
                    <td className="p-3 font-semibold text-[#2C2C24]">
                      4. Memory & State (Firestore)
                    </td>
                    <td className="p-3 text-[#555550]">
                      Cross-user data leakage, unauthorized read/write access to another user's reflections, sensitive geographic location data leakage across user accounts, tracking via stored GPS coordinates.
                    </td>
                    <td className="p-3 text-[#333333]">
                      <strong>Data Minimization:</strong> Only the place name (e.g. "Marina Beach, Chennai") and Google Place ID are persisted—never raw GPS coordinates. This drastically minimizes stored location sensitivity. Path scoping: <code className="bg-[#EDEBE4] px-1 py-0.5 rounded font-mono">/users/{`{userId}`}/reflections/{`{reflectionId}`}</code> guarded by strict rule <code className="bg-[#EDEBE4] px-1 py-0.5 rounded font-mono">request.auth.uid == userId</code>. Location metadata is stored directly within the owner-bound reflection document, inheriting identical isolation enforcement as journal text.
                    </td>
                  </tr>
                  <tr className="hover:bg-[#EDEBE4]/40">
                    <td className="p-3 font-semibold text-[#2C2C24]">
                      5. Inter-System Communication
                    </td>
                    <td className="p-3 text-[#555550]">
                      API key theft via browser DevTools inspection, credential leakage in git history, Google Places / Maps API key abuse.
                    </td>
                    <td className="p-3 text-[#333333]">
                      Gemini API key is kept exclusively on the server (<code className="bg-[#EDEBE4] px-1 py-0.5 rounded font-mono">process.env.GEMINI_API_KEY</code>); Google Places / Maps API key retrieved via environment variable / Secret Manager (never hardcoded); HTTP referrer restrictions enforced in Google Cloud Console; autocomplete & geocoding proxied through backend with <code className="bg-[#EDEBE4] px-1 py-0.5 rounded font-mono">client=aistudio-agent</code>.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Derived Data & Ethical AI Non-Profiling Standard */}
          <div>
            <h3 className="text-base font-serif font-bold text-[#2C2C24] mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#5A5A40]" />
              2. Derived Data & Ethical Non-Profiling Architecture
            </h3>
            <div className="p-4 rounded-xl bg-[#EDEBE4] border border-[#D9D7CE] space-y-2 text-xs">
              <div className="flex items-center gap-2 font-serif font-bold text-[#4A4A30]">
                <span>Mandatory Non-Automated Decision Principle</span>
              </div>
              <p className="text-[#555550] leading-relaxed">
                The application computes derived sentiment metrics (mood scores 1-5, emotion labels, and reasoning) via Gemini 3.6 Flash. Under our threat model and ethical AI constraints:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[#333333]">
                <li><strong>No Automated Decisions:</strong> Mood scores are strictly descriptive for personal contemplation and are <strong>never</strong> used to gate feature access, trigger automated penalties, or make decisions about the user without explicit human input.</li>
                <li><strong>User Agency & Override:</strong> Users maintain full sovereignty to inspect, manually adjust (1-5), or delete their analyzed scores in the Reflection Editor at any time.</li>
                <li><strong>Zero Secondary Processing:</strong> Derived sentiment scores remain partitioned inside the owner's Firestore document tree (<code className="font-mono bg-[#FDFCF9] px-1 py-0.5 rounded border border-[#D9D7CE]">/users/{`{userId}`}/reflections</code>) and are never aggregated for behavioral profiling or third-party tracking.</li>
              </ul>
            </div>
          </div>

          {/* Model Resilience Ladder */}
          <div>
            <h3 className="text-base font-serif font-bold text-[#2C2C24] mb-2 flex items-center gap-2">
              <Server className="w-4 h-4 text-[#5A5A40]" />
              3. Gemini Model Resilience Ladder
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-[#EDEBE4] border border-[#D9D7CE]">
                <span className="inline-block px-2 py-0.5 bg-[#5A5A40] text-[#F5F5F0] font-semibold rounded text-[10px] mb-1">
                  Primary Model
                </span>
                <p className="font-mono font-semibold text-[#2C2C24]">gemini-3.6-flash</p>
                <p className="text-[#555550] mt-1">High-speed conversational reflection and summarization.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#EDEBE4] border border-[#D9D7CE]">
                <span className="inline-block px-2 py-0.5 bg-[#706E64] text-[#F5F5F0] font-semibold rounded text-[10px] mb-1">
                  Fallback 1 (HA)
                </span>
                <p className="font-mono font-semibold text-[#2C2C24]">gemini-3.1-flash-lite</p>
                <p className="text-[#555550] mt-1">High-availability lightweight failover if primary has rate-limits.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#EDEBE4] border border-[#D9D7CE]">
                <span className="inline-block px-2 py-0.5 bg-[#8A887D] text-[#F5F5F0] font-semibold rounded text-[10px] mb-1">
                  Fallback 2 (Dynamic)
                </span>
                <p className="font-mono font-semibold text-[#2C2C24]">gemini-flash-latest</p>
                <p className="text-[#555550] mt-1">Dynamic latest alias for continuous service stability.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#EDEBE4] border border-[#D9D7CE]">
                <span className="inline-block px-2 py-0.5 bg-[#4A4A30] text-[#F5F5F0] font-semibold rounded text-[10px] mb-1">
                  Fallback 3 (Deep)
                </span>
                <p className="font-mono font-semibold text-[#2C2C24]">gemini-3.7-flash</p>
                <p className="text-[#555550] mt-1">Deep reasoning fallback for complex multi-turn inquiries.</p>
              </div>
            </div>
          </div>

          {/* Test Cases Verification */}
          <div>
            <h3 className="text-base font-serif font-bold text-[#2C2C24] mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-[#5A5A40]" />
              4. Verification & Manual Test Suite
            </h3>
            <ul className="space-y-1.5 text-xs text-[#555550] list-disc list-inside">
              <li><strong>Auth Flow:</strong> Click Google Sign-In, confirm user token is stored in Firebase Auth state and user is routed to private dashboard.</li>
              <li><strong>Firestore Isolation:</strong> Create entry "Daily Reflection #1", verify it is written to <code className="font-mono">/users/{`{auth.uid}`}/reflections/{`{id}`}</code> and inaccessible without that UID.</li>
              <li><strong>Gemini Multi-Turn:</strong> Send a reflection thought, verify Gemini 3.6 Flash responds empathetically, and the dialogue is saved in real-time.</li>
              <li><strong>Summarization, Tags & Sentiment:</strong> Click "AI Summarize & Tag" to generate summary, tags, and descriptive sentiment score (1-5), verified stored in Firestore.</li>
              <li><strong>Mood Trend Chart & Non-Profiling:</strong> Open Mood Trends view; verify longitudinal curve and metrics render without automated algorithmic decision-making.</li>
              <li><strong>Location Tagging & Isolation:</strong> Click "Attach Location" (strictly opt-in), type in the Google Places search bar to see live suggestions, select a place (e.g. "Marina Beach, Chennai"). Verify only the place name and Place ID (no raw coordinates) save to the entry's user-isolated Firestore path, and the UI/history only displays the place name.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#EDEBE4] border-t border-[#D9D7CE] flex justify-end">
          <button
            id="dismiss-threat-modal-button"
            onClick={onClose}
            className="px-4 py-2 bg-[#5A5A40] text-[#F5F5F0] rounded-lg text-xs font-semibold hover:bg-[#4A4A30] transition-colors"
          >
            Close Security Overview
          </button>
        </div>
      </div>
    </div>
  );
};
