'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  Container,
  Heading,
  Link,
  FormErrorMessage,
} from '@chakra-ui/react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Background from '../../components/Background';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { register, isLoading, error } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!username) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      await register(email, username, password);
      // User will stay on register page to connect wallet
    } catch (err) {
      // Error is now handled by the AuthContext
      console.error('Registration failed:', err);
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
                <Heading size="xl" color="white">Create Account</Heading>
                <Text mt={2} color="whiteAlpha.900">Join the Digimon community</Text>
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

                  <FormControl isInvalid={!!errors.username}>
                    <FormLabel color="whiteAlpha.900">Username</FormLabel>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      bg="whiteAlpha.200"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.600' }}
                      borderColor="whiteAlpha.300"
                      _hover={{ borderColor: 'whiteAlpha.400' }}
                      _focus={{ borderColor: 'blue.300', boxShadow: 'none' }}
                    />
                    <FormErrorMessage>{errors.username}</FormErrorMessage>
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

                  <FormControl isInvalid={!!errors.confirmPassword}>
                    <FormLabel color="whiteAlpha.900">Confirm Password</FormLabel>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      bg="whiteAlpha.200"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.600' }}
                      borderColor="whiteAlpha.300"
                      _hover={{ borderColor: 'whiteAlpha.400' }}
                      _focus={{ borderColor: 'blue.300', boxShadow: 'none' }}
                    />
                    <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
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
                    loadingText="Creating Account..."
                  >
                    Create Account
                  </Button>

                  <Text color="whiteAlpha.900">
                    Already have an account?{' '}
                    <Link
                      color="blue.300"
                      onClick={() => router.push('/login')}
                      _hover={{ color: 'blue.400' }}
                    >
                      Log in here
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
