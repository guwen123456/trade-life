import { createRoot } from "react-dom/client";
import { TradeApp } from "@/components/trade/TradeApp";
import "./styles.css";

const root = document.getElementById("root");
if (root) createRoot(root).render(<TradeApp />);
