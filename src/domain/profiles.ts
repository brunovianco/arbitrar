import type { RiskProfileId } from "./types";

export type RiskProfile = {
  id: RiskProfileId;
  label: string;
  minimumSpreadPesos: number;
  description: string;
};

export const riskProfiles: RiskProfile[] = [
  {
    id: "conservative",
    label: "Conservador",
    minimumSpreadPesos: 80,
    description: "Vender solo si el efectivo supera al oficial por $80.",
  },
  {
    id: "balanced",
    label: "Balanceado",
    minimumSpreadPesos: 35,
    description: "Aceptar una prima moderada sobre el oficial.",
  },
  {
    id: "aggressive",
    label: "Agresivo",
    minimumSpreadPesos: 0,
    description: "Operar desde el punto de equilibrio.",
  },
];

export function getRiskProfile(profileId: RiskProfileId): RiskProfile {
  return riskProfiles.find((profile) => profile.id === profileId) ?? riskProfiles[0];
}
