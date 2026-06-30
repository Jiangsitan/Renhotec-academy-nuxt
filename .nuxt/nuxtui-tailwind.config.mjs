
      import { defaultExtractor as createDefaultExtractor } from "tailwindcss/lib/lib/defaultExtractor.js";
      import { customSafelistExtractor, generateSafelist } from "/Users/lucasjay/work_code/Renhotec Academy/academy_nuxt/node_modules/.pnpm/@nuxt+ui@2.22.3_magicast@0.5.3_vite@7.3.5_@types+node@26.0.1_jiti@2.7.0_terser@5.48.0_y_85c30173c5606bdfe9911352c24dd0ef/node_modules/@nuxt/ui/dist/runtime/utils/colors";
      import formsPlugin from "@tailwindcss/forms";
      import aspectRatio from "@tailwindcss/aspect-ratio";
      import typography from "@tailwindcss/typography";
      import containerQueries from "@tailwindcss/container-queries";
      import headlessUi from "@headlessui/tailwindcss";

      const defaultExtractor = createDefaultExtractor({ tailwindConfig: { separator: ':' } });

      export default {
        plugins: [
          formsPlugin({ strategy: 'class' }),
          aspectRatio,
          typography,
          containerQueries,
          headlessUi
        ],
        content: {
          files: [
            "/Users/lucasjay/work_code/Renhotec Academy/academy_nuxt/node_modules/.pnpm/@nuxt+ui@2.22.3_magicast@0.5.3_vite@7.3.5_@types+node@26.0.1_jiti@2.7.0_terser@5.48.0_y_85c30173c5606bdfe9911352c24dd0ef/node_modules/@nuxt/ui/dist/runtime/components/**/*.{vue,mjs,ts}",
            "/Users/lucasjay/work_code/Renhotec Academy/academy_nuxt/node_modules/.pnpm/@nuxt+ui@2.22.3_magicast@0.5.3_vite@7.3.5_@types+node@26.0.1_jiti@2.7.0_terser@5.48.0_y_85c30173c5606bdfe9911352c24dd0ef/node_modules/@nuxt/ui/dist/runtime/ui.config/**/*.{mjs,js,ts}"
          ],
          transform: {
            vue: (content) => {
              return content.replaceAll(/(?:\r\n|\r|\n)/g, ' ')
            }
          },
          extract: {
            vue: (content) => {
              return [
                ...defaultExtractor(content),
                ...customSafelistExtractor("U", content, ["red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose","primary"], ["primary"])
              ]
            }
          }
        },
        safelist: generateSafelist(["primary"], ["red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose","primary"]),
      }
    