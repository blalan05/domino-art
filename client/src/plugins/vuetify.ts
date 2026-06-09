import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

export const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dominoDark',
    themes: {
      dominoDark: {
        dark: true,
        colors: {
          primary: '#e94560',
          secondary: '#ffd166',
          accent: '#06d6a0',
          background: '#1a1a2e',
          surface: '#16213e',
        },
      },
    },
  },
});
