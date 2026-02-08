window.chrome = {
    storage: {
        sync: {
            get: (keys, cb) => {
                console.log('Mock storage.get called with', keys);
                cb({
                    enabled: true,
                    targetLang: 'zh-CN',
                    dictEnabled: true,
                    dictTriggerMode: 'both',
                    dictShowPhonetic: true
                });
            },
            set: (items, cb) => {
                console.log('Mock storage.set called with', items);
                if (cb) cb();
            }
        },
        onChanged: {
            addListener: (cb) => {
                console.log('Mock storage.onChanged listener added');
            }
        }
    },
    runtime: {
        onMessage: {
            addListener: () => { }
        },
        onInstalled: {
            addListener: () => { }
        }
    }
};
