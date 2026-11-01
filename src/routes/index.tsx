import { createFileRoute } from "@tanstack/react-router";
import { TradeApp } from "@/components/trade/TradeApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <TradeApp />;
}
