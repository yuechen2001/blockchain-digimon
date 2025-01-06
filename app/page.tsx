'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Link,
} from '@chakra-ui/react';
import Digimon from '../shared/models/Digimon';
import DigimonDisplay from '../components/digimonDisplay';


export default function Home() {
  const [digimon, setDigimon] = useState<Digimon | null>(null);
  const API_URL = 'https://digi-api.com/api/v1/digimon/';

  /**
   * Fetches a random Digimon from the API and updates the state.
   * It generates a random number to select a Digimon, makes an API
   * request to fetch the Digimon data, and sets the state with the
   * received data.
   */
  async function getRandomDigimon() {
    const rngNumber = Math.floor(Math.random() * 100);
    const response = await fetch(`${API_URL}${rngNumber}`);
    const data = await response.json();
    setDigimon(data);
  }

  useEffect(() => {
    async function fetchRandomDigimon() {
      await getRandomDigimon();
    }
    fetchRandomDigimon();
  }, []);

  return (
    <Box
      bg="dark blue"
      p={8}
      display="flex"
      flexDirection="column"
      alignItems="center"
      minH="100vh"
    >
      <Heading
        as="h1"
        mb={6}
        color="white"
      >
        Home
      </Heading>

      <Link
        href="/favouriteDigimons"
        color="white"
        fontSize="lg"
      >
        Favourite Digimons
      </Link>

      <Link
        href="/transactions"
        color="white"
        fontSize="lg"
      >
        Transactions
      </Link>
      <Button
        onClick={getRandomDigimon}
        colorScheme="teal"
        size="lg"
        mt={6}
        mb={6}
      >
        Get Digimon
      </Button>

      <Box
        w="100%"
        maxW="md"
        p={4}
        bg="white"
        borderRadius="md"
        boxShadow="md"
      >
        <DigimonDisplay digimon={digimon} />
      </Box>
    </Box>
  );
}

