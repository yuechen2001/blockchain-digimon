'use client';
import { useEffect, useState } from 'react';
import { Text } from '@chakra-ui/react';

interface TimeRemainingProps {
  expiresAt: number | string;
  color?: string;
}

export default function TimeRemaining({ expiresAt, color }: TimeRemainingProps) {
  const [remaining, setRemaining] = useState('0');
  const [hoursRemaining, setHoursRemaining] = useState(0);
  
  useEffect(() => {
    if (!expiresAt) return;
    
    const expireTimestamp = typeof expiresAt === 'string' ? parseInt(expiresAt) : expiresAt;
    const calculate = () => {
      const now = Date.now();
      const timeLeftMs = (expireTimestamp * 1000) - now;
      const daysLeft = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeLeftMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      setRemaining(daysLeft.toString());
      setHoursRemaining(hoursLeft);
    };
    
    calculate();
    
    // Update every hour
    const interval = setInterval(calculate, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, [expiresAt]);
  
  const isLowTime = parseInt(remaining) < 2;
  
  return (
    <Text color={color || (isLowTime ? "red.500" : "blue.600")} fontWeight="semibold">
      {remaining} Days {hoursRemaining > 0 ? `${hoursRemaining} Hours` : ''}
    </Text>
  );
}
