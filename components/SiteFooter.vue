<script setup lang="ts">
import { Gamepad2, Info, FileText, Scale, Github } from 'lucide-vue-next'
import { ICON_URL } from '~/game/brand'
import { REPO } from '~/data/site'

</script>

<template>
  <footer class="site-foot">
    <div class="foot-row">
      <div class="foot-id">
        <img :src="ICON_URL" alt="" width="40" height="40" />
        <div>
          <strong>Nebulon</strong>
          <p>Infinite Frontier</p>
        </div>
      </div>
      <nav class="foot-icons" aria-label="Site">
        <NavLink to="/" aria-label="Play" title="Play"><Gamepad2 :size="20" /></NavLink>
        <NavLink to="/about" aria-label="About" title="About"><Info :size="20" /></NavLink>
        <NavLink to="/terms" aria-label="Terms and Conditions" title="Terms and Conditions"><FileText :size="20" /></NavLink>
        <NavLink to="/license" aria-label="License" title="License"><Scale :size="20" /></NavLink>
        <a :href="REPO" target="_blank" rel="noopener" aria-label="Nebulon on GitHub" title="GitHub"><Github :size="20" /></a>
      </nav>
    </div>
    <p class="foot-legal">&copy; 2026 Nebulon. Open source.</p>
  </footer>
</template>
