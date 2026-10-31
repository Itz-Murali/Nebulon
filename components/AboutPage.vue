<script setup lang="ts">
import { MODES, SHIPS, UNIVERSES, DISCOVERIES } from '~/game/config'
import { ART_URL } from '~/game/brand'
import { Github } from 'lucide-vue-next'
import { CREATORS, STACK, REPO, SITE, MUSIC } from '~/data/site'

const site = useSite()

const toc = [
  { id: 'overview', label: 'Overview' },
  { id: 'flying', label: 'Flying Nebulon' },
  { id: 'universes', label: 'Universes and wormholes' },
  { id: 'offline', label: 'Install and offline play' },
  { id: 'stack', label: 'Tech stack' },
  { id: 'opensource', label: 'Open source' },
  { id: 'creators', label: 'Creators' }
]

const modes = Object.values(MODES)
const firstSentence = (s: string) => s.split('. ')[0]!.replace(/\.$/, '') + '.'
const realms = UNIVERSES.filter(u => u.realm).map(u => u.name)
const photoFailed = reactive<Record<string, boolean>>({})
const lift = (e: MouseEvent) => pop((e.currentTarget as HTMLElement).querySelector('.cr-photo'))

</script>

<template>
  <DocShell current="about" :toc="toc">
    <section class="hero" aria-label="Nebulon">
      <div class="hero-sky" aria-hidden="true" />
      <BrandLogo size="hero" class="a-in" />
      <p class="hero-lead a-in">An endless 3D flight through procedurally dressed universes. Dodge the debris, bank the energy, and cross wormholes into the unknown.</p>
      <div class="hero-actions a-in">
        <button class="btn-solid" type="button" @click="site.home()">Launch Nebulon</button>
        <NavLink to="/terms" class="btn-ghost">Terms and license</NavLink>
      </div>
    </section>

    <section id="overview" class="sec">
      <h2>Overview</h2>
      <div class="split">
        <div class="prose">
          <p>
            Nebulon is a space-flight game that runs entirely in your browser. You pilot a ship through an endless field of asteroids, wrecks, comets and energy anomalies, collect energy to build your score, and push the hyperdrive when you need distance.
          </p>
          <p>
            There are {{ modes.length }} missions, {{ SHIPS.length }} ships, {{ UNIVERSES.length }} universes and {{ DISCOVERIES.length }} rare discoveries to find. Your records and settings are saved on your device. Nothing is uploaded and there is no account to create.
          </p>
        </div>
        <figure class="art">
          <img :src="ART_URL" alt="A silver starfighter flying past a planet, with the Nebulon logo below" width="320" height="320" loading="lazy" />
        </figure>
      </div>
    </section>

    <section id="flying" class="sec">
      <h2>Flying Nebulon</h2>
      <div class="prose">
        <p>One hit ends a run, so the game rewards reading the field early and moving smoothly.</p>
      </div>
      <dl class="facts">
        <div><dt>Keyboard</dt><dd>WASD or the arrow keys steer. Hold Space for hyperdrive. Esc pauses.</dd></div>
        <div><dt>Touch and mouse</dt><dd>Drag to steer and hold the on-screen button for hyperdrive. You can change touch sensitivity in Settings.</dd></div>
        <div v-for="m in modes" :key="m.id"><dt>{{ m.name }} mission</dt><dd>{{ firstSentence(m.desc) }}</dd></div>
      </dl>
      <p class="note">The game pauses by itself when the tab is hidden, so you never lose a run to a notification.</p>
    </section>

    <section id="universes" class="sec">
      <h2>Universes and wormholes</h2>
      <div class="prose">
        <p>
          Every so often a wormhole opens ahead. Fly through it and you arrive in a different universe, chosen at random. A shuffle bag makes sure you see most of them before any repeat, so a long run keeps changing.
        </p>
        <p>
          Each universe has its own sky, lighting and hazards. {{ realms.length }} of them are realms with a mechanic of their own, such as {{ realms.slice(0, 4).join(', ') }}. Some hold rare discoveries that are recorded in your codex.
        </p>
      </div>
    </section>

    <section id="offline" class="sec">
      <h2>Install and offline play</h2>
      <div class="prose">
        <p>
          Nebulon is a progressive web app. Install it from your browser (or use Settings, then Install app) and the game, its fonts, images and music are stored on your device. After the first visit you can play with no connection.
        </p>
        <p>
          On iPhone and iPad, tap Share, then Add to Home Screen. Updates arrive automatically the next time you are online.
        </p>
      </div>
    </section>

    <section id="stack" class="sec">
      <h2>Tech stack</h2>
      <div class="prose">
        <p>Nebulon is a static site with no backend. Everything below runs in the browser.</p>
      </div>
      <ul class="stack">
        <li v-for="s in STACK" :key="s.name">
          <a :href="s.href" target="_blank" rel="noopener">{{ s.name }}</a>
          <span>{{ s.detail }}</span>
        </li>
      </ul>
    </section>

    <section id="opensource" class="sec">
      <h2>Open source</h2>
      <div class="prose">
        <p>
          Nebulon is open source. The code, the issue tracker and the history of every change are public, and contributions are welcome. The game lives online at
          <a :href="SITE" target="_blank" rel="noopener">nebulon-frontier.vercel.app</a>.
        </p>
        <p>Music in the game: {{ MUSIC.title }} by {{ MUSIC.artist }}.</p>
      </div>
      <p class="repo-row">
        <a class="btn-ghost" :href="REPO" target="_blank" rel="noopener"><Github :size="18" /><span>Nebulon on GitHub</span></a>
      </p>
    </section>

    <section id="creators" class="sec">
      <h2>Creators</h2>
      <div class="creators">
        <article v-for="c in CREATORS" :key="c.handle" class="creator" @mouseenter="lift">
          <div class="cr-ring">
            <div class="cr-photo">
              <img v-if="!photoFailed[c.handle]" :src="c.photo" :alt="c.handle" width="144" height="144" loading="lazy" referrerpolicy="no-referrer" @error="photoFailed[c.handle] = true" />
              <span v-else aria-hidden="true">{{ c.handle.slice(4, 5) }}</span>
            </div>
          </div>
          <h3 :aria-label="c.handle">{{ c.name }}</h3>
          <p class="cr-handle">@{{ c.handle }}</p>
          <a class="cr-gh" :href="c.github" target="_blank" rel="noopener" :aria-label="c.handle + ' on GitHub'">
            <Github :size="18" /><span>GitHub</span>
          </a>
        </article>
      </div>
    </section>
  </DocShell>
</template>
