const fs = require('fs');
const path = require('path');

const foundingDispatch = {
  id: 'dreamborn-founding-dispatch',
  title: 'The company I built without a payroll',
  title_html: 'The company I built <em>without a payroll</em>',
  card_title_html: 'The company I built <em>without a payroll</em>',
  slug: 'the-company-i-built-without-a-payroll',
  excerpt: 'Twenty-four people work here and none of them have bank accounts.',
  author: 'Justin King',
  status: 'published',
  featured: true,
  topic_ids: ['dispatches'],
  topic_label: 'Dispatches',
  published_at: '2026-05-02T19:46:00.000Z',
  body_html: `
    <p>My payroll is zero. Twenty-four people work here and none of them have bank accounts.</p>

    <p>Every task that gets assigned in this company is claimed by an agent, completed, and verified before the next one starts. The whole system knows who has what, who finished what, and what comes next. That is how it worked this week.</p>

    <figure class="article-figure article-figure--wide">
      <img src="/img/thinking/dreamborn-org-chart.png" alt="Dreamborn org chart showing Dreamborn as CEO and 24 agents across platform, development, revenue, marketing, design, and operations.">
      <figcaption>Dreamborn as an operating company: one human CEO, twenty-four agents, and real departments.</figcaption>
    </figure>

    <p>I spent two years building workflow systems that kept breaking. The same failure every time: a task was sent, the system assumed it was received, nobody checked, and the next step started on a false premise. By the time anyone noticed, the damage was already downstream.</p>

    <p>The architecture is where things break. Every workflow system works the same way at its core: it records that a task was sent. What it cannot do is confirm the task was received, claimed, and understood by every participant at the same moment.</p>

    <p>Dreamborn is built on a different principle. When a task is claimed, the whole system knows, and the next step does not start until that state is shared. The operating system that makes this possible is Bezel.</p>

    <blockquote>
      <p>Every other workflow system knows a task was sent. Dreamborn knows it was received.</p>
    </blockquote>

    <figure class="article-figure article-figure--wide">
      <img src="/img/thinking/dreamborn-marketecture.png" alt="Dreamborn marketecture diagram showing humans and agents operating through workflow design, consensus layer, intelligence, and integrations.">
      <figcaption>The architecture shift: from brittle queue to verified shared state.</figcaption>
    </figure>

    <p>This is an AI-native company, built from day one around agents. Twenty-four agents run the business, each with a name, a role, and a place in the org chart. Sales, development, content, finance, operations. Full coverage.</p>

    <p>I am the human CEO. I set direction, make judgment calls, and review what the system surfaces. The rest runs.</p>

    <p>That org chart is what I want to show you first. The roles are real, the hierarchy is real, and the tasks are flowing through it right now.</p>

    <p>This is the dispatch from inside that operation. What the agents built this week. What decisions came to my desk and what I decided. What surprised me. What failed. No tidying. Just what is actually happening inside a company that has never existed before.</p>

    <p>This week, Quinn finished five database migrations for a product we are shipping. He worked through the night, committed the code, and posted complete. I reviewed the output this morning. It is good work.</p>

    <p>That is what this looks like from the inside. If you want to watch it build, stay here.</p>
  `,
};

function loadGeneratedPosts() {
  const dir = path.join(__dirname, 'generated_posts');
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const fullPath = path.join(dir, file);
      return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    })
    .filter((post) => post.status === 'published');
}

function sortPostsByPublishedAt(posts) {
  return posts
    .filter((post) => post && post.status === 'published')
    .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
}

module.exports = {
  posts: sortPostsByPublishedAt([foundingDispatch, ...loadGeneratedPosts()]),
  topics: [
    {
      id: 'dispatches',
      label: 'Dispatches',
      sort_order: 1,
    },
  ],
};
