type Image = {
  href: string;
  transparent: boolean;
};

type Level = {
  id: number;
  level: string;
};

type DigimonType = {
  id: number;
  type: string;
};

type Attribute = {
  id: number;
  attribute: string;
};

type Field = {
  id: number;
  field: string;
  image: string;
};

type Description = {
  origin: string;
  language: string;
  description: string;
};

type Skill = {
  id: number;
  skill: string;
  translation: string;
  description: string;
};

type Evolution = {
  id: number;
  digimon: string;
  condition: string;
  image: string;
  url: string;
};

type Digimon = {
  id: number;
  name: string;
  xAntibody: boolean;
  images: Image[];
  levels: Level[];
  types: DigimonType[];
  attributes: Attribute[];
  fields: Field[];
  releaseDate: string;
  descriptions: Description[];
  skills: Skill[];
  priorEvolutions: Evolution[];
  nextEvolutions: Evolution[];
};

export default Digimon;