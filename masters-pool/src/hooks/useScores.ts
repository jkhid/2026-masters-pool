"use client";
import { useState, useEffect, useCallback } from "react";
import { ScoreData } from "@/lib/types";

export function useScores() {
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchScores = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      const res = await fetch("/api/scores");
      if (!res.ok) throw new Error("Failed to fetch scores");
      const data: ScoreData = await res.json();
      setScoreData(data);
      setLastFetch(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scores");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();

    // Poll: 60s during tournament hours (Thu-Sun 8am-8pm ET), 5min otherwise
    const getInterval = () => {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      const isTournamentDay = day >= 4 || day === 0; // Thu-Sun
      const isTournamentHours = hour >= 8 && hour <= 20;
      return isTournamentDay && isTournamentHours ? 60_000 : 300_000;
    };

    const interval = setInterval(() => fetchScores(true), getInterval());
    return () => clearInterval(interval);
  }, [fetchScores]);

  return { scoreData, loading, error, lastFetch, isRefreshing, refetch: () => fetchScores(true) };
}
