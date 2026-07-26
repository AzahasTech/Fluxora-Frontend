import React from 'react';
import { Helmet } from 'react-helmet-async';
import type { StreamRecord } from '../data/streamRecords';

/**
 * Generates Open Graph and Twitter meta tags for a given stream.
 * Uses a dynamic image URL that points to the server-generated OG image.
 */
export const MetaTags: React.FC<{ stream: StreamRecord }> = ({ stream }) => {
  const parsedUpdatedAt = stream.updatedAt ? Date.parse(stream.updatedAt) : Number.NaN;
  const hasValidUpdatedAt = Number.isFinite(parsedUpdatedAt);
  const ogImageUrl = hasValidUpdatedAt
    ? `https://fluxora.app/og-image/${stream.id}.png?v=${parsedUpdatedAt}`
    : `https://fluxora.app/og-image/${stream.id}.png`;
  const ogTitle = `${stream.name} – Fluxora`;
  const ogDescription = stream.summary ?? 'Stream treasury capital on Stellar';
  const ogAlt = `Fluxora stream ${stream.name}, status ${stream.status}, recipient ${stream.recipientName}`;

  return (
    <Helmet>
      <title>{ogTitle}</title>
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Fluxora" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:url" content={`https://fluxora.app/app/streams/${stream.id}`} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:alt" content={ogAlt} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={ogImageUrl} />
      <meta name="twitter:image:alt" content={ogAlt} />
    </Helmet>
  );
};
