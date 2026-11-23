/** @file CSS/JSのViteビルド設定。Blade更新を再読込し、生成済みBladeは監視対象から外す。 */
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js', 'resources/js/calculation-tools.js', 'resources/js/tabular-data-converter.js', 'resources/js/excel-to-csv.js', 'resources/js/json-tools.js'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
