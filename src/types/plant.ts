export type SunLevel = 'shade' | 'partial_shade' | 'medium' | 'bright_indirect' | 'full_sun';
export type CareLevel = 'easy' | 'moderate' | 'hard';
export type HumidityLevel = 'low' | 'medium' | 'high';
export type GrowthRate = 'slow' | 'medium' | 'fast';

export type Plant = {
  id: string;
  createdAt: string;
  name: string;
  species: string | null;
  commonName: string | null;
  photoUrls: string[];
  groupId: string | null;
  groupName: string | null;
  wateringDays: number | null;
};

export type PlantSummary = {
  id: string;
  createdAt: string;
  name: string;
  species: string | null;
  commonName: string | null;
  photoUrl: string | null;
  groupId: string | null;
  wateringDays: number | null;
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
  symptom: string;
  cause: string;
  solution: string;
};

export type PlantReferencePhoto = {
  url: string;
  sourceUrl: string;
};

export type PlantSpeciesInfo = {
  scientificName: string;
  commonNames: string[];
  family: string | null;
  plantType: string;
  origin: string | null;
  description: string;
  careLevel: CareLevel;
  growthRate: GrowthRate;
  matureSize: string;
  sunLevel: SunLevel;
  lightTip: string;
  wateringDaysMin: number;
  wateringDaysMax: number;
  wateringTip: string;
  humidityLevel: HumidityLevel;
  humidityTip: string;
  temperatureMinC: number;
  temperatureMaxC: number;
  soilTip: string;
  fertilizingTip: string;
  propagationMethods: string[];
  toxicToPets: boolean;
  toxicToPetsNotes: string | null;
  toxicToHumans: boolean;
  toxicToHumansNotes: string | null;
  commonProblems: PlantCommonProblem[];
  funFacts: string[];
  referencePhotos: PlantReferencePhoto[];
};

export type PlantSpeciesSearchResult = PlantSpeciesInfo & {
  id: string;
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
