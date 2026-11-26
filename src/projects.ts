/**
 * Projects shown on the home page and at /projects/.
 * Public projects include a code link. Private projects do not.
 */
export type PublicProject = {
  name: string;
  description: string;
  url: string;
  visibility: 'public';
  code: string;
};

export type PrivateProject = {
  name: string;
  description: string;
  url: string;
  visibility: 'private';
};

export type Project = PublicProject | PrivateProject;

export const projects: Project[] = [
  {
    name: 'What We Watchin?',
    description:
      'Everyone adds a few shows, the list locks, and a wheel spins until one pick is left.',
    url: 'https://what-we-watchin.vercel.app',
    visibility: 'public',
    code: 'https://github.com/michaelbrady4/what-we-watchin',
  },
  {
    name: 'Lorémon',
    description:
      "A top-down 2D RPG set in downtown Frederick, based on a friend group's real lore.",
    url: 'https://loremon.vercel.app',
    visibility: 'private',
  },
  {
    name: 'Valentine 2026',
    description: 'A page that asks Carly to be a Valentine.',
    url: 'https://valentine-2026-green.vercel.app',
    visibility: 'public',
    code: 'https://github.com/michaelbrady4/valentine-2026',
  },
  {
    name: "Erin & Dom's wedding",
    description: 'A wedding website for Erin and Dom, October 9, 2027.',
    url: 'https://byard-dacunto-wedding.vercel.app',
    visibility: 'private',
  },
];
