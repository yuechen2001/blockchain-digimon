import Digimon from '../shared/models/Digimon';

// Function to map JSON to Digimon type
export default function mapJsonToDigimon(json: DigimonJson): Digimon {
  return {
    id: json.id,
    name: json.name,
    xAntibody: json.xAntibody,
    images: json.images.map((image) => ({
      href: image.href,
      transparent: image.transparent
    })),
    levels: json.levels.map((level) => ({
      id: level.id,
      level: level.level
    })),
    types: json.types.map((type) => ({
      id: type.id,
      type: type.type
    })),
    attributes: json.attributes.map((attribute) => ({
      id: attribute.id,
      attribute: attribute.attribute
    })),
    fields: json.fields.map((field) => ({
      id: field.id,
      field: field.field,
      image: field.image
    })),
    releaseDate: json.releaseDate,
    descriptions: json.descriptions.map((description) => ({
      origin: description.origin,
      language: description.language,
      description: description.description
    })),
    skills: json.skills.map((skill) => ({
      id: skill.id,
      skill: skill.skill,
      translation: skill.translation,
      description: skill.description
    })),
    priorEvolutions: json.priorEvolutions.map((evolution) => ({
      id: evolution.id,
      digimon: evolution.digimon,
      condition: evolution.condition,
      image: evolution.image,
      url: evolution.url
    })),
    nextEvolutions: json.nextEvolutions.map((evolution) => ({
      id: evolution.id,
      digimon: evolution.digimon,
      condition: evolution.condition,
      image: evolution.image,
      url: evolution.url
    }))
  };
}

// Type for the JSON data
type DigimonJson = {
  id: number;
  name: string;
  xAntibody: boolean;
  images: Array<{
    href: string;
    transparent: boolean;
  }>;
  levels: Array<{
    id: number;
    level: string;
  }>;
  types: Array<{
    id: number;
    type: string;
  }>;
  attributes: Array<{
    id: number;
    attribute: string;
  }>;
  fields: Array<{
    id: number;
    field: string;
    image: string;
  }>;
  releaseDate: string;
  descriptions: Array<{
    origin: string;
    language: string;
    description: string;
  }>;
  skills: Array<{
    id: number;
    skill: string;
    translation: string;
    description: string;
  }>;
  priorEvolutions: Array<{
    id: number;
    digimon: string;
    condition: string;
    image: string;
    url: string;
  }>;
  nextEvolutions: Array<{
    id: number;
    digimon: string;
    condition: string;
    image: string;
    url: string;
  }>;
};
