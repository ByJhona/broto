export type Plant = {
  id: string;
  createdAt: string;
  name: string;
  species: string | null;
  commonName: string | null;
  photoUrls: string[];
  wateringDays: number | null;
  sunLevel: 'shade' | 'partial_shade' | 'medium' | 'bright_indirect' | 'full_sun' | null;
  origin: string | null;
  description: string | null;
  wateringDescription: string | null;
  careLevel: 'easy' | 'moderate' | 'hard' | null;
  toxicToPets: boolean | null;
  toxicToPetsNotes: string | null;
  toxicToHumans: boolean | null;
  toxicToHumansNotes: string | null;
  funFacts: string[] | null;
  commonProblems: PlantCommonProblem[] | null;
};

export type PlantSummary = {
  id: string;
  createdAt: string;
  name: string;
  species: string | null;
  commonName: string | null;
  photoUrl: string | null;
  wateringDays: number | null;
  sunLevel: 'shade' | 'partial_shade' | 'medium' | 'bright_indirect' | 'full_sun' | null;
};

export type PlantCandidate = {
  score: number;
  scientificName: string;
  commonName: string | null;
  family: string | null;
  genus: string | null;
  imageUrl: string | null;
};

export type PlantCommonProblem = {
  issue: string;
  likelyCause: string;
};

export type PlantSpeciesInfo = {
  scientificName: string;
  description: string;
  wateringDescription: string;
  wateringDaysMin: number;
  wateringDaysMax: number;
  sunLevel: 'shade' | 'partial_shade' | 'medium' | 'bright_indirect' | 'full_sun';
  careLevel: 'easy' | 'moderate' | 'hard';
  toxicToPets: boolean;
  toxicToPetsNotes: string | null;
  toxicToHumans: boolean;
  toxicToHumansNotes: string | null;
  funFacts: string[];
  commonProblems: PlantCommonProblem[];
  origin: string | null;
};

export type SpeciesInfoDisplay = {
  description: string;
  wateringDescription: string | null;
  toxicToPets: boolean;
  toxicToPetsNotes: string | null;
  toxicToHumans: boolean;
  toxicToHumansNotes: string | null;
  funFacts: string[];
  commonProblems: PlantCommonProblem[];
};

export type PlantGrowthCheckin = {
  id: string;
  plantId: string;
  photoUrl: string;
  observations: string[];
  createdAt: string;
};

export type DiagnosisHealthStatus = 'healthy' | 'attention' | 'urgent';
export type DiagnosisSeverity = 'low' | 'medium' | 'high';

export type PlantDiagnosisIssue = {
  title: string;
  description: string;
  severity: DiagnosisSeverity;
};

export type PlantDiagnosis = {
  id: string;
  photoUrl: string;
  healthStatus: DiagnosisHealthStatus;
  summary: string;
  issues: PlantDiagnosisIssue[];
  recommendedActions: string[];
  createdAt: string;
};
