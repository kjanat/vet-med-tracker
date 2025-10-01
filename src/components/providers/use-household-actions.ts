import { useCallback } from "react";

type InvalidateFn = (input: {
  householdId: string;
}) => Promise<unknown> | unknown;

export type BasicHouseholdAction<THousehold, TAnimal> =
  | { type: "SET_HOUSEHOLD"; payload: THousehold | null }
  | { type: "SET_ANIMAL"; payload: TAnimal | null };

type Params<THousehold, TAnimal> = {
  dispatch: (value: BasicHouseholdAction<THousehold, TAnimal>) => void;
  invalidatePendingMeds: InvalidateFn;
  selectedHouseholdId: string | null;
};

export const useHouseholdActions = <THousehold, TAnimal>({
  dispatch,
  invalidatePendingMeds,
  selectedHouseholdId,
}: Params<THousehold, TAnimal>) => {
  const setSelectedHousehold = useCallback(
    (household: THousehold | null) => {
      dispatch({ payload: household, type: "SET_HOUSEHOLD" });
    },
    [dispatch],
  );

  const setSelectedAnimal = useCallback(
    (animal: TAnimal | null) => {
      dispatch({ payload: animal, type: "SET_ANIMAL" });
    },
    [dispatch],
  );

  const refreshPendingMeds = useCallback(() => {
    if (selectedHouseholdId) {
      void invalidatePendingMeds({ householdId: selectedHouseholdId });
    }
  }, [invalidatePendingMeds, selectedHouseholdId]);

  return {
    refreshPendingMeds,
    setSelectedAnimal,
    setSelectedHousehold,
  } as const;
};
