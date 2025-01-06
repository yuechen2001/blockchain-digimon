import React from 'react';
import parse from 'html-react-parser';
import Image from 'next/image';
import { Box, Button, Heading, Text, VStack, HStack, Stack, Divider } from '@chakra-ui/react';
import Digimon from '@/shared/models/Digimon.js';

function DigimonDisplay({ digimon }: { digimon: Digimon | null }) {
  if (digimon == null) {
    return <Box />;
  }

  return (
    <Box
      className="digimon-card"
      p={6}
      borderWidth="1px"
      borderRadius="lg"
      boxShadow="md"
      bg=""
      maxW="lg"
      mx="auto"
      color="black"
    >
      <Heading
        as="h2"
        size="lg"
        className="digimon-name"
        textAlign="center"
        mb={4}
        color="black"
      >
        {digimon.name}
      </Heading>

      <Image
        className="main-digimon-image"
        src={digimon.images[0].href}
        alt={digimon.name}
        width={500}
        height={500}
        style={{ borderRadius: '8px' }}
      />

      <Button
        className="add-to-favourites-button"
        onClick={() => addDigimonToFavourites(digimon)}
        mt={4}
        colorScheme="teal"
        width="full"
        color="black"
      >
        Add to Favourites
      </Button>

      <Stack spacing={4} mt={6} color="black">
        <Box>
          <Heading as="h3" size="md" className="section-title">
            Level:
          </Heading>
          <Text>{extractLevels(digimon.levels)}</Text>
        </Box>

        <Box>
          <Heading as="h3" size="md" className="section-title">
            Type:
          </Heading>
          <Text>{extractTypes(digimon.types)}</Text>
        </Box>

        <Box>
          <Heading as="h3" size="md" className="section-title">
            Attribute:
          </Heading>
          <Text>{extractAttributes(digimon.attributes)}</Text>
        </Box>

        <Box>
          <Heading as="h3" size="md" className="section-title">
            Fields:
          </Heading>
          <Box className="field-box" mt={2}>
            {convertObjectsToChakraComponents(digimon.fields)}
          </Box>
        </Box>

        <Box>
          <Heading as="h3" size="md" className="section-title">
            Release Date:
          </Heading>
          <Text>{digimon.releaseDate}</Text>
        </Box>

        <Box>
          <Heading as="h3" size="md" className="section-title">
            Description:
          </Heading>
          <Box className="paragraph" mt={2}>
            {extractEnglishDescription(digimon.descriptions)}
          </Box>
        </Box>

        <Box>
          <Heading as="h3" size="md" className="section-title">
            Skills:
          </Heading>
          <Box mt={2}>{convertSkillsToChakraComponents(digimon.skills)}</Box>
        </Box>

        <Box>
          <Heading as="h3" size="md" className="section-title">
            Prior Evolutions:
          </Heading>
          <Box mt={2}>{convertObjectsToChakraComponents(digimon.priorEvolutions)}</Box>
        </Box>

        <Box>
          <Heading as="h3" size="md" className="section-title">
            Next Evolutions:
          </Heading>
          <Box mt={2}>{convertObjectsToChakraComponents(digimon.nextEvolutions)}</Box>
        </Box>
      </Stack>
    </Box>
  );
}

export default DigimonDisplay;

async function addDigimonToFavourites(digimon: Digimon) {
  await fetch('http://localhost:3000/api/addDigimonToFavourites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(digimon.id),
  });
}

type LevelType = {
  id: number;
  level: string;
};

function extractLevels(levels: LevelType[]): string {
  return levels.map((l) => l.level).join(', ');
}

type EntityType = {
  id: number;
  type: string;
};

function extractTypes(types: EntityType[]): string {
  return types.map((t) => t.type).join(', ');
}

type AttributeType = {
  id: number;
  attribute: string;
};

function extractAttributes(attributes: AttributeType[]): string {
  return attributes.map((a) => a.attribute).join(', ');
}

type FieldType = {
  id: number;
  field: string;
  image: string;
};

type EvolutionType = {
  id: number;
  digimon: string;
  condition: string;
  image: string;
  url: string;
};

function convertObjectsToChakraComponents(types: (FieldType | EvolutionType)[]) {
  return types.map((type) => {
    if ('digimon' in type) {
      const evolution = type as EvolutionType;
      return (
        <Box key={evolution.id} id={`digimon-${evolution.id}`} borderRadius="lg">
          <Heading as="h3" size="md" className="related-digimon-name">{evolution.digimon}</Heading>
          <Image className="secondary-digimon-image" src={evolution.image} alt={evolution.digimon} width={360} height={360} />
          <Text className="condition"><strong>Condition:</strong> {evolution.condition || 'Unknown'}</Text>
        </Box>
      );
    } else {
      const fieldType = type as FieldType;
      return (
        <HStack key={fieldType.id} className="field-row" id={`field-${fieldType.id}`} spacing={4} p={2} borderWidth="1px" borderRadius="lg">
          <Image className="field-image" src={fieldType.image} alt={fieldType.field} width={50} height={50} />
          <Heading as="h4" size="sm" className="field-name">{fieldType.field}</Heading>
        </HStack>
      );
    }
  });
}

type DescriptionType = {
  origin: string;
  language: string;
  description: string;
};

function extractEnglishDescription(descriptions: DescriptionType[]) {
  return descriptions.find((d) => d.language === 'en_us')?.description;
}

type SkillType = {
  id: number;
  skill: string;
  translation: string;
  description: string;
};

function convertSkillsToChakraComponents(skills: SkillType[]) {
  return skills.map((skill) => (
    <React.Fragment key={skill.id}>
      <Text className="skill-description">
        <strong>{skill.skill}</strong>: {skill.description}
      </Text>
      <br />
    </React.Fragment>
  ));
}
