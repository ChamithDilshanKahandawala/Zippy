import React, { useEffect } from 'react';
import { View, Alert } from 'react-native';
import { useRideStatus } from '../../hooks/useRideStatus';
import { cancelRide } from '../../services/rideService';
import { SearchingDriverView } from './SearchingDriverView';
import { DriverAssignedView } from './DriverAssignedView';
import { OngoingRideView } from './OngoingRideView';
import { PaymentSummaryView } from './PaymentSummaryView';

interface RideWorkflowContainerProps {
  rideId: string;
  onRideCompleted: () => void; // Callback to reset parent UI (e.g. clear routes)
  onRideCancelled: () => void; // Callback to reset parent UI
}

export const RideWorkflowContainer = ({ rideId, onRideCompleted, onRideCancelled }: RideWorkflowContainerProps) => {
  const { ride, loading, error } = useRideStatus(rideId);

  // If there's an error fetching the ride (e.g. network issue), maybe show an alert or retry
  useEffect(() => {
    if (error) {
      Alert.alert("Ride Error", "Could not track ride status. Please check your connection.");
    }
  }, [error]);

  const handleCancel = async () => {
    Alert.alert(
      "Cancel Ride?",
      "Are you sure you want to cancel the request?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive", 
          onPress: async () => {
             try {
               await cancelRide(rideId);
               onRideCancelled();
             } catch (err) {
               Alert.alert("Error", "Failed to cancel ride");
             }
          }
        }
      ]
    );
  };

  if (loading) {
    // Optionally return null or a skeleton here if you want to avoid flicker
    // But since `ride` might be null initially, it's safer to just return null until data loads
    return null; 
  }

  if (!ride) {
    // If loading is done but no ride found, perhaps it was deleted or cancelled remotely
    // We can trigger the cancelled callback to be safe
    // However, useEffect is better than calling callback in render
    return null; 
  }

  // State Machine Render Logic
  if (!ride) return null;

  switch (ride.status) {
    case 'PENDING':
    case 'SEARCHING':
      return <SearchingDriverView rideId={ride.id} onCancel={handleCancel} />;
      
    case 'ACCEPTED':
    case 'ARRIVED':
      // Driver is on the way or arrived
      if (!ride.driver) return <SearchingDriverView rideId={ride.id} onCancel={handleCancel} />; // Fallback
      return (
        <DriverAssignedView
          rideId={ride.id} 
          driver={ride.driver} 
          estimatedTime={ride.status === 'ARRIVED' ? 'Arrived!' : 'On the way'}
          onCancel={handleCancel}
        />
      );
      
    case 'IN_PROGRESS':
      // Ride is in progress
      return <OngoingRideView ride={ride} />;
      
    case 'COMPLETED':
      // Ride finished, show payment/rating summary
      return <PaymentSummaryView ride={ride} onClose={onRideCompleted} />;
      
    default:
      return null;
  }
};
