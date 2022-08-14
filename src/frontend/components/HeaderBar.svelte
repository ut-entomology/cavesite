<script lang="ts">
  import { appInfo } from '../stores/appInfo';
</script>

<header>
  <div class="container-fluid">
    <div class="app_title">{$appInfo.appTitle}</div>
    <div class="app_subtitle text">{$appInfo.appSubtitle}</div>
  </div>
</header>

<style lang="scss">
  @import '../variables.scss';

  header {
    color: $pageBarTextColor;
    padding: 0.5rem 0 1rem 0;
    text-align: center;
  }

  .app_title {
    color: $texasRed;
    font-size: 1.5rem;
    font-weight: bold;
  }

  .app_subtitle {
    font-size: 1.1rem;
  }
</style>
