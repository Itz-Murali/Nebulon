<script setup lang="ts">
import { Github } from 'lucide-vue-next'
import { UPDATED, REPO, SITE, MUSIC } from '~/data/site'

const toc = [
  { id: 'accept', label: 'Accepting these terms' },
  { id: 'play', label: 'Playing the game' },
  { id: 'data', label: 'Your data' },
  { id: 'content', label: 'Content and credit' },
  { id: 'warranty', label: 'No warranty' },
  { id: 'changes', label: 'Changes' }
]

</script>

<template>
  <DocShell current="terms" :toc="toc">
    <header class="doc-head">
      <h1 class="a-in">Terms and Conditions</h1>
      <p class="a-in">Last updated {{ UPDATED }}. These terms cover your use of Nebulon: Infinite Frontier, the game and the website at {{ SITE.replace('https://', '') }}.</p>
    </header>

    <section id="accept" class="sec">
      <h2>Accepting these terms</h2>
      <div class="prose">
        <p>By opening the game, installing it, or pressing Start Flight, you agree to these Terms and Conditions and to the <NavLink to="/license">License</NavLink>. If you do not agree, please do not play.</p>
      </div>
    </section>

    <section id="play" class="sec">
      <h2>Playing the game</h2>
      <div class="prose">
        <p>Nebulon is free to play. You may play it for personal, non-commercial enjoyment. Please do not:</p>
        <ul>
          <li>copy the site and present it as your own work,</li>
          <li>use the game to attack, overload or probe the hosting service,</li>
          <li>remove or hide the credits, notices or author names that appear in the game.</li>
        </ul>
        <p>You can use the source code as the License allows, provided you keep the required credit.</p>
      </div>
    </section>

    <section id="data" class="sec">
      <h2>Your data</h2>
      <div class="prose">
        <p>Nebulon has no accounts and no server database. Your records, selected ship and settings are saved in your own browser storage and stay on your device. Clearing site data, or using Reset all data in Settings, erases them for good.</p>
        <p>If you install the game as an app, the game files and music are stored on your device so it can run offline. Uninstalling the app or clearing site data removes them.</p>
        <p>The game does not use advertising or analytics. The hosting provider may keep ordinary server logs, such as IP addresses, as part of delivering the site.</p>
      </div>
    </section>

    <section id="content" class="sec">
      <h2>Content and credit</h2>
      <div class="prose">
        <p>
          Nebulon is open source. The code is public at
          <a :href="REPO" target="_blank" rel="noopener"><Github :size="15" class="inline-icon" aria-hidden="true" /> github.com/Itz-Murali/Nebulon</a>
          and is shared under the terms on the <NavLink to="/license">License page</NavLink>, which require credit to its creators, Itz-Murali and Itz-Anya.
        </p>
        <p>The music in the game, {{ MUSIC.title }} by {{ MUSIC.artist }}, belongs to its artist. Third-party libraries and fonts keep their own licenses, which are listed on the License page.</p>
      </div>
    </section>

    <section id="warranty" class="sec">
      <h2>No warranty</h2>
      <div class="prose">
        <p>The game is provided as it is, without warranties of any kind. It may contain bugs, change, or become unavailable. To the extent the law allows, the developers are not liable for any loss or damage arising from playing or from being unable to play. Some games include flashing lights and fast motion, so take breaks, and stop if you feel unwell.</p>
      </div>
    </section>

    <section id="changes" class="sec">
      <h2>Changes</h2>
      <div class="prose">
        <p>We may update these terms as the game changes. The date at the top of this page shows the latest revision. Continuing to play after a change means you accept the updated terms.</p>
      </div>
    </section>
  </DocShell>
</template>
