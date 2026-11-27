import type { APIRoute, GetStaticPaths } from 'astro';
import { getPosts } from '../../lib/posts';
import { renderOgPng, staticCards, type OgCard } from '../../lib/og';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPosts();
  const cards: OgCard[] = [
    ...staticCards,
    ...posts.map((post) => ({
      slug: `blog/${post.id}`,
      title: post.data.title,
      subtitle: post.data.description,
    })),
  ];
  return cards.map((card) => ({ params: { slug: card.slug }, props: { card } }));
};

export const GET: APIRoute = ({ props }) => {
  const png = renderOgPng(props.card as OgCard);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
