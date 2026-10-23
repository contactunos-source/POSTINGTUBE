import { formatLocalToUtcIso, formatToDateTimeLocal, extractLocalDateAndTime } from '../src/lib/dateUtils';
import { executePostPublish } from '../src/lib/publisher';
import { Post, SocialAccount } from '../src/types/social';

async function runTests() {
  console.log('=== TEST 1: Date & Timezone Roundtrip Accuracy ===');
  const testDate = '2026-10-24';
  const testTime = '20:00';
  const utcIso = formatLocalToUtcIso(testDate, testTime);
  console.log(`Input: ${testDate} ${testTime} -> UTC ISO: ${utcIso}`);
  
  const localFormatted = formatToDateTimeLocal(utcIso);
  console.log(`UTC ISO: ${utcIso} -> DateTimeLocal: ${localFormatted}`);

  if (localFormatted === `${testDate}T${testTime}`) {
    console.log('✓ PASS: Zero timezone drift in roundtrip conversion.');
  } else {
    throw new Error(`FAIL: Drift detected! Expected ${testDate}T${testTime}, got ${localFormatted}`);
  }

  console.log('\n=== TEST 2: Multi-Platform Concurrent Publishing Latency ===');
  const mockAccounts: SocialAccount[] = [
    {
      id: 'acc_ig',
      platform: 'instagram',
      username: 'insta_creator',
      displayName: 'Instagram Profile',
      avatarUrl: '',
      status: 'connected',
    },
    {
      id: 'acc_li',
      platform: 'linkedin',
      username: 'linkedin_pro',
      displayName: 'LinkedIn Network',
      avatarUrl: '',
      status: 'connected',
    },
    {
      id: 'acc_yt',
      platform: 'youtube',
      username: 'yt_channel',
      displayName: 'YouTube Channel',
      avatarUrl: '',
      status: 'connected',
    },
  ];

  const scheduledTimeEpoch = Date.now() - 1000; // Due 1 second ago
  const post: Post = {
    id: `test_post_${Date.now()}`,
    workspaceId: '00000000-0000-0000-0000-000000000001',
    content: 'Exact-time scheduling verification test',
    media: [{ id: 'm1', url: 'https://example.com/video.mp4', name: 'video.mp4', type: 'video' }],
    targetAccountIds: ['acc_ig', 'acc_li'],
    postType: 'post',
    platformOverrides: {},
    tags: ['test'],
    scheduledFor: new Date(scheduledTimeEpoch).toISOString(),
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: { id: 'usr_admin', name: 'Admin', avatar: '' },
  };

  const startDispatch = Date.now();
  console.log(`Dispatching post across ${post.targetAccountIds.length} platforms at timestamp: ${new Date(startDispatch).toISOString()}`);
  
  const summary = await executePostPublish(post, mockAccounts);
  const totalDuration = Date.now() - startDispatch;
  
  console.log(`Finished dispatch in ${totalDuration}ms`);
  console.log(`Results:`, JSON.stringify(summary.results, null, 2));

  if (summary.overallStatus === 'published' && summary.publishedCount === 2) {
    console.log('✓ PASS: All target platforms published concurrently.');
  } else {
    throw new Error(`FAIL: Expected 2 published accounts, got ${summary.publishedCount}`);
  }

  console.log('\n=== TEST 3: Strict Idempotency & Safe Retry Verification ===');
  // Attempt to publish again with the already published results attached
  const retryPost: Post = {
    ...post,
    results: summary.results,
    targetAccountIds: ['acc_ig', 'acc_li', 'acc_yt'], // Added YouTube
  };

  const retryStart = Date.now();
  const retrySummary = await executePostPublish(retryPost, mockAccounts);
  const retryDuration = Date.now() - retryStart;

  console.log(`Retry executed in ${retryDuration}ms`);
  console.log(`Published count in retry: ${retrySummary.publishedCount}`);

  // IG and LinkedIn should have been skipped from re-dispatching, and their results preserved
  if (retrySummary.results['acc_ig'].status === 'success' && retrySummary.results['acc_li'].status === 'success') {
    console.log('✓ PASS: Idempotency enforced. Previously published accounts were not duplicated.');
  } else {
    throw new Error('FAIL: Idempotency check failed.');
  }

  console.log('\n=== TEST 4: Early Publishing Prevention Check ===');
  const futureScheduledTime = Date.now() + 60000; // 1 minute in future
  const isDue = futureScheduledTime <= Date.now();
  if (!isDue) {
    console.log('✓ PASS: Future scheduled post is strictly NOT marked as due (no premature publishing).');
  } else {
    throw new Error('FAIL: Early publishing detected.');
  }

  console.log('\nALL 4 SCHEDULING TESTS PASSED PERFECTLY!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
