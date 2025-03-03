'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  Link,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Background from '../../components/Background';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login, isLoading, error } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login(email, password);
      // Navigation is handled in the login function
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <Background>
      <Container maxW="container.xl" py={20} position="relative" zIndex={2}>
        <VStack spacing={10} align="center" textAlign="center">
          <Box
            bg="blackAlpha.700"
            p={8}
            borderRadius="2xl"
            backdropFilter="blur(10px)"
            width="100%"
            maxW="md"
          >
            <VStack spacing={6}>
              <Box textAlign="center">
                <Heading size="xl" color="white">Welcome Back</Heading>
                <Text mt={2} color="whiteAlpha.900">Sign in to your account</Text>
              </Box>

              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <VStack spacing={4}>
                  <FormControl isInvalid={!!errors.email}>
                    <FormLabel color="whiteAlpha.900">Email</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      bg="whiteAlpha.200"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.600' }}
                      borderColor="whiteAlpha.300"
                      _hover={{ borderColor: 'whiteAlpha.400' }}
                      _focus={{ borderColor: 'blue.300', boxShadow: 'none' }}
                    />
                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!errors.password}>
                    <FormLabel color="whiteAlpha.900">Password</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      bg="whiteAlpha.200"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.600' }}
                      borderColor="whiteAlpha.300"
                      _hover={{ borderColor: 'whiteAlpha.400' }}
                      _focus={{ borderColor: 'blue.300', boxShadow: 'none' }}
                    />
                    <FormErrorMessage>{errors.password}</FormErrorMessage>
                  </FormControl>

                  {error && (
                    <Text color="red.300" fontSize="sm">
                      {error}
                    </Text>
                  )}

                  <Button
                    type="submit"
                    colorScheme="blue"
                    size="lg"
                    width="100%"
                    isLoading={isLoading}
                    loadingText="Signing In..."
                  >
                    Sign In
                  </Button>

                  <Text color="whiteAlpha.900">
                    Don't have an account?{' '}
                    <Link
                      color="blue.300"
                      onClick={() => router.push('/register')}
                      _hover={{ color: 'blue.400' }}
                    >
                      Register here
                    </Link>
                  </Text>
                </VStack>
              </form>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Background>
  );
}
