# Leith Bass Space

The code behind leithbass.space, Jack Elliot's bass teaching site in Leith, Edinburgh.

| Folder | What it is |
| :-- | :-- |
| `plugin/leithbass-members/` | The WordPress plugin: the Members Portal, the Shed (metronome, drone, tuner and the rest), and the three rooms: Ear Training, Read and Harmonic Elements |
| `theme/leithbass-theme/` | The WordPress theme |
| `skill/leith-bass-worksheets/` | The Claude skill that makes worksheets and session notes in the house style |
| `tests/` | Node test suites. Each takes the path to the files it checks |
| `tools/` | Scripts that build generated files (the Guides, the sound packs) |

## Releasing

The site takes two zips, uploaded through wp-admin, plugin first:

    cd plugin && zip -r ../leithbass-members-X.Y.Z.zip leithbass-members
    cd theme  && zip -r ../leithbassX.Y.Z.zip leithbass-theme

Nothing is launched by installing: each room has its own Launch tickbox in the theme.

## Tests

    node tests/harmonic-elements-rules-test-1.13.js plugin/leithbass-members/assets/harmonic
    node tests/metronome-rules-test-1.13.js plugin/leithbass-members/assets

## House rules

No frameworks, no build step, no new dependencies. Samples are CC0 and credited. The fuller brief, the build notes for each release and the course texts are kept in the Claude Project "Leith Bass Space".
