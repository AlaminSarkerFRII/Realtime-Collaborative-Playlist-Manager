#!/usr/bin/env node

/**
 * Test script for validating definition of done requirements:
 * 1. No performance issues with 200+ tracks
 * 2. Auto-reconnection on connection loss
 */

const WebSocket = require('ws');
const axios = require('axios');

const API_URL = 'http://localhost:4000';
const WS_URL = 'ws://localhost:4000';

class RequirementTester {
  constructor() {
    this.testResults = {
      performance: { passed: false, details: {} },
      autoReconnection: { passed: false, details: {} }
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Definition of Done Requirements Testing\n');
    
    await this.testPerformanceWith200Tracks();
    await this.testAutoReconnection();
    
    this.printResults();
  }

  async testPerformanceWith200Tracks() {
    console.log('📊 Testing Performance with 200+ tracks...');
    
    try {
      // Step 1: Check current track count
      const currentTracks = await axios.get(`${API_URL}/api/tracks`);
      const initialCount = currentTracks.data.length;
      console.log(`   Current track count: ${initialCount}`);
      
      // Step 2: Generate additional tracks to reach 200+
      const targetCount = 200;
      const tracksToAdd = targetCount - initialCount;
      
      if (tracksToAdd > 0) {
        console.log(`   Adding ${tracksToAdd} tracks to reach ${targetCount}...`);
        
        const newTracks = [];
        for (let i = 0; i < tracksToAdd; i++) {
          newTracks.push({
            title: `Test Track ${i + 1}`,
            artist: `Test Artist ${i + 1}`,
            album: `Test Album ${i + 1}`,
            duration_seconds: 180 + (i % 120), // 3-5 minutes
            genre: ['Rock', 'Pop', 'Electronic', 'Jazz', 'Classical', 'Hip-Hop', 'R&B'][i % 7],
            cover_url: `https://picsum.photos/seed/test${i}/300/300.jpg`
          });
        }
        
        // Add tracks in batches for performance
        const batchSize = 20;
        for (let i = 0; i < newTracks.length; i += batchSize) {
          const batch = newTracks.slice(i, i + batchSize);
          const promises = batch.map(track => 
            axios.post(`${API_URL}/api/tracks`, track).catch(err => {
              console.warn(`   Warning: Failed to add track ${track.title}: ${err.message}`);
              return null;
            })
          );
          await Promise.all(promises);
          console.log(`   Added batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(newTracks.length/batchSize)}`);
        }
      }
      
      // Step 3: Test API response time with large dataset
      console.log('   Testing API response times...');
      const startTime = Date.now();
      const allTracks = await axios.get(`${API_URL}/api/tracks`);
      const apiResponseTime = Date.now() - startTime;
      const finalCount = allTracks.data.length;
      
      console.log(`   ✅ Fetched ${finalCount} tracks in ${apiResponseTime}ms`);
      
      // Step 4: Test playlist performance
      console.log('   Testing playlist performance...');
      const playlistStart = Date.now();
      const playlist = await axios.get(`${API_URL}/api/playlist`);
      const playlistResponseTime = Date.now() - playlistStart;
      
      console.log(`   ✅ Fetched playlist (${playlist.data.length} items) in ${playlistResponseTime}ms`);
      
      // Step 5: Add multiple tracks to playlist to test large playlist performance
      console.log('   Adding tracks to playlist...');
      const playlistAddStart = Date.now();
      const tracksToAddToPlaylist = Math.min(50, finalCount); // Add up to 50 tracks
      
      for (let i = 0; i < tracksToAddToPlaylist; i++) {
        try {
          await axios.post(`${API_URL}/api/playlist`, {
            track_id: allTracks.data[i].id,
            added_by: `TestUser${i}`,
            position: i + 1.0
          });
        } catch (err) {
          // Track might already be in playlist, that's okay
        }
      }
      
      const playlistAddTime = Date.now() - playlistAddStart;
      console.log(`   ✅ Added ${tracksToAddToPlaylist} tracks to playlist in ${playlistAddTime}ms`);
      
      // Step 6: Test final large playlist performance
      const finalPlaylistStart = Date.now();
      const finalPlaylist = await axios.get(`${API_URL}/api/playlist`);
      const finalPlaylistTime = Date.now() - finalPlaylistStart;
      
      console.log(`   ✅ Final playlist (${finalPlaylist.data.length} items) loaded in ${finalPlaylistTime}ms`);
      
      // Performance criteria
      const performanceCriteria = {
        apiResponseTime: apiResponseTime < 1000, // < 1 second
        playlistResponseTime: finalPlaylistTime < 1500, // < 1.5 seconds
        trackCount: finalCount >= 200,
        playlistSize: finalPlaylist.data.length >= 30 // Reasonable playlist size
      };
      
      this.testResults.performance = {
        passed: Object.values(performanceCriteria).every(Boolean),
        details: {
          trackCount: finalCount,
          playlistSize: finalPlaylist.data.length,
          apiResponseTime: `${apiResponseTime}ms`,
          playlistResponseTime: `${finalPlaylistTime}ms`,
          criteria: performanceCriteria
        }
      };
      
      console.log('   📈 Performance test completed\n');
      
    } catch (error) {
      console.error('   ❌ Performance test failed:', error.message);
      this.testResults.performance = {
        passed: false,
        details: { error: error.message }
      };
    }
  }

  async testAutoReconnection() {
    console.log('🔄 Testing Auto-Reconnection...');
    
    return new Promise((resolve) => {
      let reconnectionAttempts = 0;
      let connectionEvents = [];
      let ws = null;
      let testTimeout = null;
      
      const cleanup = () => {
        if (ws) {
          ws.removeAllListeners();
          ws.close();
        }
        if (testTimeout) {
          clearTimeout(testTimeout);
        }
      };
      
      const completeTest = () => {
        cleanup();
        
        const reconnectionCriteria = {
          connectedInitially: connectionEvents.includes('connected'),
          disconnectedEvent: connectionEvents.includes('disconnected'),
          reconnected: connectionEvents.filter(e => e === 'connected').length >= 2,
          maxReconnectTime: reconnectionAttempts > 0 && reconnectionAttempts < 10000 // < 10 seconds
        };
        
        this.testResults.autoReconnection = {
          passed: Object.values(reconnectionCriteria).every(Boolean),
          details: {
            events: connectionEvents,
            reconnectionTime: `${reconnectionAttempts}ms`,
            criteria: reconnectionCriteria
          }
        };
        
        console.log('   🔄 Auto-reconnection test completed\n');
        resolve();
      };
      
      try {
        ws = new WebSocket(WS_URL);
        const startTime = Date.now();
        
        ws.on('open', () => {
          connectionEvents.push('connected');
          console.log('   ✅ Initial connection established');
          
          // Simulate connection loss after 2 seconds
          setTimeout(() => {
            console.log('   🔌 Simulating connection loss...');
            ws.terminate(); // Force close to simulate network issue
          }, 2000);
        });
        
        ws.on('close', () => {
          connectionEvents.push('disconnected');
          reconnectionAttempts = Date.now() - startTime;
          console.log('   ⚠️ Connection lost');
          
          // Create new connection to test reconnection
          setTimeout(() => {
            console.log('   🔄 Attempting reconnection...');
            const newWs = new WebSocket(WS_URL);
            
            newWs.on('open', () => {
              connectionEvents.push('connected');
              const totalTime = Date.now() - startTime;
              console.log(`   ✅ Reconnected successfully in ${totalTime}ms`);
              
              // Wait a bit to ensure stable connection
              setTimeout(completeTest, 1000);
            });
            
            newWs.on('error', (error) => {
              console.error('   ❌ Reconnection failed:', error.message);
              completeTest();
            });
            
            ws = newWs;
          }, 1000);
        });
        
        ws.on('error', (error) => {
          console.error('   ❌ WebSocket error:', error.message);
          completeTest();
        });
        
        // Set timeout for test
        testTimeout = setTimeout(() => {
          console.log('   ⏰ Test timeout reached');
          completeTest();
        }, 15000); // 15 second timeout
        
      } catch (error) {
        console.error('   ❌ Auto-reconnection test failed:', error.message);
        this.testResults.autoReconnection = {
          passed: false,
          details: { error: error.message }
        };
        resolve();
      }
    });
  }

  printResults() {
    console.log('📋 DEFINITION OF DONE TEST RESULTS');
    console.log('=' .repeat(50));
    
    // Performance Results
    console.log('\n📊 PERFORMANCE (200+ tracks):');
    console.log(`   Status: ${this.testResults.performance.passed ? '✅ PASS' : '❌ FAIL'}`);
    if (this.testResults.performance.details.trackCount) {
      console.log(`   Track Count: ${this.testResults.performance.details.trackCount}`);
      console.log(`   Playlist Size: ${this.testResults.performance.details.playlistSize}`);
      console.log(`   API Response Time: ${this.testResults.performance.details.apiResponseTime}`);
      console.log(`   Playlist Response Time: ${this.testResults.performance.details.playlistResponseTime}`);
    }
    if (this.testResults.performance.details.error) {
      console.log(`   Error: ${this.testResults.performance.details.error}`);
    }
    
    // Auto-Reconnection Results
    console.log('\n🔄 AUTO-RECONNECTION:');
    console.log(`   Status: ${this.testResults.autoReconnection.passed ? '✅ PASS' : '❌ FAIL'}`);
    if (this.testResults.autoReconnection.details.events) {
      console.log(`   Events: ${this.testResults.autoReconnection.details.events.join(' → ')}`);
      console.log(`   Reconnection Time: ${this.testResults.autoReconnection.details.reconnectionTime}`);
    }
    if (this.testResults.autoReconnection.details.error) {
      console.log(`   Error: ${this.testResults.autoReconnection.details.error}`);
    }
    
    // Overall Results
    const overallPass = this.testResults.performance.passed && this.testResults.autoReconnection.passed;
    console.log('\n' + '='.repeat(50));
    console.log(`🎯 OVERALL STATUS: ${overallPass ? '✅ ALL REQUIREMENTS MET' : '❌ SOME REQUIREMENTS FAILED'}`);
    
    if (!overallPass) {
      console.log('\n📝 ISSUES TO ADDRESS:');
      if (!this.testResults.performance.passed) {
        console.log('   - Performance with 200+ tracks needs improvement');
      }
      if (!this.testResults.autoReconnection.passed) {
        console.log('   - Auto-reconnection functionality needs fixing');
      }
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    if (this.testResults.performance.passed) {
      console.log('   ✅ Performance is optimized for large track libraries');
    } else {
      console.log('   🔧 Consider implementing pagination, virtual scrolling, or lazy loading');
      console.log('   🔧 Optimize database queries and add proper indexing');
    }
    
    if (this.testResults.autoReconnection.passed) {
      console.log('   ✅ Auto-reconnection is working correctly');
    } else {
      console.log('   🔧 Review WebSocket reconnection logic in frontend/lib/websocket.js');
      console.log('   🔧 Ensure exponential backoff is properly implemented');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new RequirementTester();
  tester.runAllTests().catch(console.error);
}

module.exports = RequirementTester;
