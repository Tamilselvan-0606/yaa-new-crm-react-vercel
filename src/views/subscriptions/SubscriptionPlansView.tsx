import React from 'react';
import { SubscriptionsView } from './SubscriptionsView';

export const SubscriptionPlansView: React.FC = () => {
  return <SubscriptionsView initialViewMode="plans" lockMode={true} />;
};
