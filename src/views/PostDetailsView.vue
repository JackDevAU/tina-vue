<template>
  <div v-if="post">
    <h1>{{ post.title }}</h1>
    <pre>
      {{  JSON.stringify(post.body, null, 2) }}
    </pre>
  </div>
  <div v-else>
    Loading or no content available...
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted,watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { client } from '../../tina/__generated__/client';
import {useTina} from "../hooks/use-tina"

// Define an interface for the post data
interface Post {
  title: string;
  body: string;
}

// Create a reactive reference for the post data
const post = ref<Post | null>(null); // Type post as Post or null

// Get the route object to access the slug
const route = useRoute();

// Fetch the post data using the slug from the route
watchEffect(async () => {
  const slug = route.params.slug;
  
  // Check if slug is correct
  console.log("Fetching post with slug:", slug);

  try {
    const props = await client.queries.post({ relativePath: `${slug}.md` });
    const {data} = useTina(props)
    // Log data to ensure the API call is working
    console.log("Post data:", data);

    post.value = data.post; // Assign the post data to the reactive ref
  } catch (error) {
    console.error('Error fetching post:', error);
  }
});
</script>
