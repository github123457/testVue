import Vue from 'vue'
import About from '@/components/About'
import { APP_NAME, APP_DESCRIPTION, APP_VERSION } from '@/config'

describe('About.vue', () => {
  it('should render project name, description and version', () => {
    const Constructor = Vue.extend(About)
    const vm = new Constructor().$mount()
    expect(vm.$el.querySelector('h1').textContent).toEqual(APP_NAME)
    expect(vm.$el.querySelector('.description').textContent).toContain(APP_DESCRIPTION)
    expect(vm.$el.querySelector('.version').textContent).toContain(APP_VERSION)
  })
})
