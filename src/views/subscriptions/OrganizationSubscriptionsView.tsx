import React from 'react';
import { SubscriptionsView } from './SubscriptionsView';

export const OrganizationSubscriptionsView: React.FC = () => {
  return <SubscriptionsView initialViewMode="subscriptions" lockMode={true} />;
};
