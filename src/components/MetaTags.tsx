import React from 'react';
import { Helmet } from 'react-helmet-async';
import type { StreamRecord } from '../data/streamRecords';

const getOrigin = (): string => {
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.location !== 'undefined' &&
    globalThis.location.origin
  ) {
    return globalThis.location.origin;
  }
  return 'https://fluxora.app';
};

/**
 * Generates Open Graph and Twitter meta tags for a given stream.
 * Uses a dynamic image URL that points to the server-generated OG image.
 */
export const MetaTags: React.FC<{ stream: StreamRecord }> = ({ stream }) => {
  const origin = getOrigin();
  const updatedAtTimestamp = stream.updatedAt ? Date.parse(stream.updatedAt) : 0;
  const cacheBuster = Number.isFinite(updatedAtTimestamp) ? updatedAtTimestamp : 0;
  const ogImageUrl = `${origin}/og-image/${stream.id}.png?v=${cacheBuster}`;
  const ogTitle = `${stream.name} – Fluxora`;
  const ogDescription = stream.summary ?? 'Stream treasury capital on Stellar';
  const ogAlt = `Fluxora stream ${stream.name}, status ${stream.status}, recipient ${stream.recipient}`;

  return (
    <Helmet>
      <title>{ogTitle}</title>
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Fluxora" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:url" content={`${origin}/app/streams/${stream.id}`} />
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
