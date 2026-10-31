<script setup lang="ts">
import licenseText from '~/LICENSE?raw'
import { LIBRARIES, REPO, UPDATED } from '~/data/site'

const toc = [
  { id: 'summary', label: 'In short' },
  { id: 'text', label: 'License text' },
  { id: 'libraries', label: 'Third-party software' }
]

</script>

<template>
  <DocShell current="license" :toc="toc">
    <header class="doc-head">
      <h1 class="a-in">License</h1>
      <p class="a-in">Last updated {{ UPDATED }}. Nebulon is open source, and this page reproduces the license that comes with the code.</p>
    </header>

    <section id="summary" class="sec">
      <h2>In short</h2>
      <div class="prose">
        <p>You may use, copy, modify, merge, publish, distribute, sublicense and sell the software. In return you must:</p>
        <ul>
          <li>give clear credit to both <strong>Itz-Murali</strong> and <strong>Itz-Anya</strong> as the original creators,</li>
          <li>show that credit in your README and in any About screen or credits section, with a link to the original repository,</li>
          <li>keep the copyright notice and this license text in all copies, and not remove existing credits,</li>
          <li>not claim to be the original author, or imply the original creators endorse your project.</li>
        </ul>
        <p class="credit-line">Based on Nebulon by Itz-Murali and Itz-Anya - {{ REPO }}</p>
        <p>This summary is a convenience. The license text below is what applies.</p>
      </div>
    </section>

    <section id="text" class="sec">
      <h2>License text</h2>
      <pre class="license-text" tabindex="0" aria-label="Full license text">{{ licenseText }}</pre>
    </section>

    <section id="libraries" class="sec">
      <h2>Third-party software</h2>
      <div class="prose">
        <p>Nebulon is built with open-source software. Each project keeps its own license.</p>
      </div>
      <ul class="stack">
        <li v-for="l in LIBRARIES" :key="l.name">
          <a :href="l.href" target="_blank" rel="noopener">{{ l.name }}</a>
          <span>{{ l.license }}</span>
        </li>
      </ul>
    </section>
  </DocShell>
</template>
