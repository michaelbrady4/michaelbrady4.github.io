/**
 * Site-wide settings. Edit this file to change the name, bio, email, and profile links.
 * The home page photo is src/assets/michael.jpg (a 3:4 portrait, about 600 pixels wide).
 */
export const site = {
  name: 'Michael Brady',
  url: 'https://michaelbrady4.github.io',
  email: 'mb.bradymike@gmail.com',
  bio: [
    'I’m Michael, an AI Product Manager at C3 AI with a background in data science and software engineering.',
    'I build agentic AI products that help people make sense of information, solve problems, and get things done. I enjoy getting into the technical details and working through the product decisions that make something intuitive and useful.',
    'I’m especially interested in AI assistants and how they’re becoming part of everyday life. I’m always trying new products and dissecting what makes each one different, from the experience of using it to the particular problem it solves. With so many AI products competing for attention, I like understanding the small design choices and niche capabilities that make someone choose one and keep using it.',
    'I earned my master’s degree in Computer Science from the University of Colorado Boulder and bachelor’s degrees in Computer Science and Business Administration from Hood College in Frederick, Maryland.',
  ],
  links: {
    x: 'https://x.com/brady__michael',
    linkedin: 'https://www.linkedin.com/in/michael-brady-72a898126/',
  },
} as const;
