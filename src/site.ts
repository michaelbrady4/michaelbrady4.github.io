/**
 * Site-wide settings. Edit this file to change the name, bio, email, and profile links.
 * The home page photo is src/assets/michael.jpg (a 3:4 portrait, about 600 pixels wide).
 */
export const site = {
  name: 'Michael Brady',
  url: 'https://michaelbrady4.github.io',
  role: 'AI Product Manager at C3 AI',
  email: 'mb.bradymike@gmail.com',
  bio: [
    'I’m a product manager at C3 AI, where I work on agentic AI products. My background is in data science and software engineering, so I like getting into the technical details.',
    'I’m always trying new software, and I pay attention to why some of it just clicks. Most of the time it comes down to a few small decisions that make it feel right to use.',
    'I have a master’s in Computer Science from CU Boulder, and bachelor’s degrees in Computer Science and Business Administration from Hood College.',
  ],
  links: {
    x: 'https://x.com/brady__michael',
    linkedin: 'https://www.linkedin.com/in/michael-brady-72a898126/',
  },
} as const;
