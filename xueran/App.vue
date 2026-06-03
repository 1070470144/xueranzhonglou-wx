<script>
	import { installSilentDefaultLoading } from '@/utils/silentLoading.js';

	export default {
		onLaunch: function() {
			installSilentDefaultLoading();
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
