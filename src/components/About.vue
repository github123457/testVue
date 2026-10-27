<template>
  <div class="about">
    <h1>{{ appName }}</h1>
    <p class="description">{{ appDescription }}</p>
    <p class="version">版本：{{ appVersion }}</p>
  </div>
</template>

<script>
import { APP_NAME, APP_DESCRIPTION, APP_VERSION } from '@/config'

export default {
  name: 'About',
  data () {
    return {
      appName: APP_NAME,
      appDescription: APP_DESCRIPTION,
      appVersion: APP_VERSION
    }
  }
}
</script>

<style scoped>
.about {
  padding: 20px;
}
.description {
  font-size: 16px;
  color: #555;
}
.version {
  font-size: 14px;
  color: #999;
}
</style>
