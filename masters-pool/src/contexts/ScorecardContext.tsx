"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ScoreData } from "@/lib/types";
import ScorecardModal from "@/components/ScorecardModal";

interface ScorecardContextType {
  openScorecard: (golferName: string) => void;
}

const ScorecardContext = createContext<ScorecardContextType>({
  openScorecard: () => {},
});

export function ScorecardProvider({ children, scoreData }: { children: ReactNode; scoreData: ScoreData | null }) {
  const [selectedGolfer, setSelectedGolfer] = useState<string | null>(null);

  const openScorecard = useCallback((name: string) => {
    setSelectedGolfer(name);
  }, []);

  const closeScorecard = useCallback(() => {
    setSelectedGolfer(null);
  }, []);

  const scorecards = selectedGolfer ? scoreData?.golfers[selectedGolfer]?.scorecards ?? [] : [];

  return (
    <ScorecardContext.Provider value={{ openScorecard }}>
      {children}
      {selectedGolfer && (
        <ScorecardModal
          golferName={selectedGolfer}
          scorecards={scorecards}
          onClose={closeScorecard}
        />
      )}
    </ScorecardContext.Provider>
  );
}

export const useScorecard = () => useContext(ScorecardContext);
