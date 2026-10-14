import React from 'react';
import { api } from '../api/client.js';
import useAsync from '../hooks/useAsync.js';
import FoodGrid from './FoodGrid.jsx';
import { SkeletonGrid, ErrorState } from './ui/States.jsx';

/** Fetches /api/foods with `params` and shows loading / error / empty / results. */
export default function FoodSection({ params, skeletons = 4, empty, onData }) {
  const key = JSON.stringify(params);
  const { data, loading, error, reload } = useAsync(() => api.foods(params).then((d) => { onData?.(d); return d; }), [key]);
  if (loading) return <SkeletonGrid n={skeletons} />;
  if (error) return <ErrorState title="Unable to load food listings." message="Please try again." onRetry={reload} />;
  return <FoodGrid list={data.items} empty={empty} />;
}
