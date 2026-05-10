import { useState, useRef, useEffect } from "react";
import axios from "axios";

const CPP_URL = "https://mini-google-map-algorithm.onrender.com";
const ML_URL  = "https://urban-sense-ai.onrender.com";

async function geocode(place) {
  const r = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: { q: place, format: "json", limit: 1, countrycodes: "us",
              viewbox: "-87.6,31.0,-80.0,24.5", bounded: 1 }
  });
  if (r.data?.length) return { lat: parseFloat(r.data[0].lat), lng: parseFloat(r.data[0].lon), name: r.data[0].display_name.split(",")[0] };
  return null;
}

function extractPlaces(text) {
  const patterns = [
    /from\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?:\?|$|\.)/i,
    /([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?:\?|$|\.)/i,
    /between\s+([A-Za-z\s]+?)\s+and\s+([A-Za-z\s]+?)(?:\?|$|\.)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return [m[1].trim(), m[2].trim()];
  }
  return null;
}

function getRiskSummary(segments) {
  const counts = { Safe: 0, Moderate: 0, Risky: 0, Dangerous: 0 };
  segments.forEach(s => { if (counts[s.risk] !== undefined) counts[s.risk]++; });
  const total = segments.length;
  const dangerPct = Math.round(((counts.Risky + counts.Dangerous) / total) * 100);
  const avgProb = segments.reduce((a, s) => a + (s.probability || 0), 0) / total;

  let overall, emoji;
  if (avgProb < 0.3)      { overall = "Safe";      emoji = "🟢"; }
  else if (avgProb < 0.5) { overall = "Moderate";  emoji = "🟡"; }
  else if (avgProb < 0.7) { overall = "Risky";     emoji = "🟠"; }
  else                    { overall = "Dangerous";  emoji = "🔴"; }

  return { counts, total, dangerPct, avgProb: Math.round(avgProb * 100), overall, emoji };
}

const GREETINGS = ["hi", "hello", "hey", "howdy", "sup", "good morning", "good evening"];
const HELP_KEYWORDS = ["help", "what can you do", "commands", "how"];

function getBotResponse(text) {
  const lower = text.toLowerCase().trim();
  if (GREETINGS.some(g => lower.includes(g)))
    return "👋 Hi! I'm your driving safety assistant. Ask me things like:\n• \"Is it safe to drive from Miami to Orlando?\"\n• \"Route from Tampa to Jacksonville\"\n• \"How dangerous is driving from Hialeah to Fort Lauderdale?\"";
  if (HELP_KEYWORDS.some(k => lower.includes(k)))
    return "I can analyze driving safety for any route in Florida! Just tell me your start and destination.\n\nExamples:\n• \"Miami to Orlando\"\n• \"Is it safe from Tampa to Gainesville?\"\n• \"Route from Naples to Fort Myers\"";
  if (lower.includes("weather"))
    return "🌤️ Weather affects risk predictions! Currently I use real-time conditions. Rain, fog, and night driving increase accident probability.";
  if (lower.includes("thank"))
    return "You're welcome! Stay safe on the roads 🚗";
  return null;
}

export default function Chatbot({ onRouteFound }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "👋 Hi! I'm your driving safety assistant.\n\nAsk me: \"Is it safe to drive from Miami to Orlando?\"" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const addMessage = (from, text, extra = {}) => {
    setMessages(prev => [...prev, { from, text, ...extra }]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    addMessage("user", text);

    // Check simple responses first
    const simple = getBotResponse(text);
    if (simple) { addMessage("bot", simple); return; }

    // Try to extract places
    const places = extractPlaces(text);
    if (!places) {
      addMessage("bot", "I couldn't find two locations in your message. Try: \"from Miami to Orlando\" or \"Miami to Tampa\"");
      return;
    }

    setLoading(true);
    addMessage("bot", `🔍 Looking up "${places[0]}" and "${places[1]}"...`);

    try {
      // Geocode both places
      const [startCoord, endCoord] = await Promise.all([geocode(places[0] + " Florida"), geocode(places[1] + " Florida")]);

      if (!startCoord) { addMessage("bot", `❌ Couldn't find "${places[0]}" in Florida. Try being more specific.`); setLoading(false); return; }
      if (!endCoord)   { addMessage("bot", `❌ Couldn't find "${places[1]}" in Florida. Try being more specific.`); setLoading(false); return; }

      addMessage("bot", `📍 Found: ${startCoord.name} → ${endCoord.name}\n🗺️ Calculating route...`);

      // Get route from C++ backend
      const routeRes = await axios.post(`${CPP_URL}/shortest-path`, {
        start: { lat: startCoord.lat, lng: startCoord.lng },
        end:   { lat: endCoord.lat,   lng: endCoord.lng }
      });

      if (!routeRes.data?.path?.length) { addMessage("bot", "❌ No route found between these locations."); setLoading(false); return; }

      const path = routeRes.data.path;
      const distKm = (routeRes.data.distance_meters / 1000).toFixed(1);

      addMessage("bot", `✅ Route found! ${distKm} km\n🧠 Analyzing accident risk...`);

      // Get ML predictions
      const mlRes = await axios.post(`${ML_URL}/predict-route`, {
        state: "fl",
        weather_api_key: "",
        points: path.map(p => ({ node_id: p.node_id || 0, lat: p.lat, lng: p.lng }))
      });

      const segments = mlRes.data?.segments || [];
      const summary = getRiskSummary(segments);

      // Send route to map
      if (onRouteFound) onRouteFound({ start: startCoord, end: endCoord, path, segments });

      // Build response
      const response = `${summary.emoji} **${summary.overall} Route** (${distKm} km)

📊 Risk breakdown:
🟢 Safe: ${summary.counts.Safe} segments
🟡 Moderate: ${summary.counts.Moderate} segments  
🟠 Risky: ${summary.counts.Risky} segments
🔴 Dangerous: ${summary.counts.Dangerous} segments

⚠️ ${summary.dangerPct}% of the route has elevated risk.
📈 Average accident probability: ${summary.avgProb}%

${summary.overall === "Safe" ? "✅ This looks like a safe route!" :
  summary.overall === "Moderate" ? "⚠️ Drive carefully, some moderate risk areas." :
  summary.overall === "Risky" ? "🚨 Stay alert! Multiple risky segments." :
  "🚨 High danger route! Consider an alternative."}

The route has been plotted on the map. 🗺️`;

      addMessage("bot", response, { summary });

    } catch (err) {
      console.error(err);
      addMessage("bot", "❌ Something went wrong. Make sure both servers are running and try again.");
    }
    setLoading(false);
  };

  return (
    <>
      {/* Chat bubble button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--primary)", color: "#fff",
          border: "none", cursor: "pointer", fontSize: 24,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}
        title="Driving Safety Assistant"
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 90, right: 24, zIndex: 9998,
          width: 360, height: 500,
          background: "var(--card-bg)", borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column",
          border: "1px solid var(--border)", overflow: "hidden"
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px", background: "var(--primary)",
            color: "#fff", display: "flex", alignItems: "center", gap: 10
          }}>
            <span style={{ fontSize: 20 }}>🚗</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Driving Safety Assistant</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Powered by ML risk prediction</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "12px 14px",
            display: "flex", flexDirection: "column", gap: 10
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: msg.from === "user" ? "flex-end" : "flex-start"
              }}>
                <div style={{
                  maxWidth: "80%", padding: "8px 12px",
                  borderRadius: msg.from === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.from === "user" ? "var(--primary)" : "var(--card-hover)",
                  color: msg.from === "user" ? "#fff" : "var(--text)",
                  fontSize: 13, lineHeight: 1.5,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                  border: msg.from === "bot" ? "1px solid var(--border)" : "none"
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  padding: "8px 14px", borderRadius: "16px 16px 16px 4px",
                  background: "var(--card-hover)", border: "1px solid var(--border)",
                  fontSize: 13, color: "var(--muted)"
                }}>
                  ⟳ Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 12px", borderTop: "1px solid var(--border)",
            display: "flex", gap: 8
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Ask about driving safety..."
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 20,
                border: "1px solid var(--border)", background: "var(--bg)",
                color: "var(--text)", fontSize: 13, outline: "none"
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                padding: "8px 16px", borderRadius: 20,
                background: "var(--primary)", color: "#fff",
                border: "none", cursor: "pointer", fontSize: 13,
                opacity: loading || !input.trim() ? 0.5 : 1
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
