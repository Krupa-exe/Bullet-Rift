# Bullet Rift

Um jogo no estilo **Vampire Survivors** com temática de **League of Legends**, feito em HTML5 Canvas e JavaScript puro, sem dependências e sem etapa de build.

Escolha um campeão, sobreviva **15 minutos** na Fenda enfrentando ondas de tropas, monstros da selva, o Arauto, o Dragão e o Barão Na'Shor, e monte sua build com habilidades e itens a cada nível.

## Como jogar

Abra o `index.html` no navegador. Também dá para servir a pasta com qualquer servidor estático, por exemplo:

```bash
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

Para publicar, basta ativar o **GitHub Pages** no repositório apontando para a branch com estes arquivos.

### Controles

| Ação | Teclado | Celular |
| --- | --- | --- |
| Mover | `WASD` / setas | arrastar o dedo na tela |
| Ultimate | `Espaço` / `R` | botão **R** |
| Flash (teleporte curto) | `F` / `Shift` | botão ⚡ |
| Pausar | `Esc` / `P` | botão ❚❚ |
| Escolher melhoria | `1` `2` `3` | toque |
| Rerrolar melhorias (custa ouro) | `R` na tela de nível | botão |
| Som liga/desliga | `M` | botão no menu |

As habilidades disparam sozinhas, como em Vampire Survivors. Você só controla o movimento, o Flash e a ultimate.

## Conteúdo

### Campeões

| Campeão | Habilidade inicial | Passiva | Ultimate |
| --- | --- | --- | --- |
| **Garen** | Julgamento: espada giratória ao redor | +regeneração e armadura | Justiça Demaciana: espada gigante no inimigo mais forte |
| **Ashe** | Rajada: leque de flechas que desaceleram | +10% de crítico | Flecha de Cristal Encantada: atravessa e atordoa |
| **Lux** | Prisão da Luz: raio que perfura e enraíza | +área e +dano | Centelha Final: laser que atravessa a tela |
| **Jinx** | Ossos de Peixe: foguetes explosivos | +velocidade e bônus ao abater elites | Super Mega Míssil da Morte: explosão enorme |

### Habilidades (máx. 6, nível 1 a 5)

Julgamento, Rajada, Prisão da Luz, Ossos de Peixe, Singularidade Lucente, Orbe da Ilusão (Ahri), Lâmina Estática de Statikk, Tibbers (Annie) e Armadilha Venenosa (Teemo).

### Itens (máx. 6, como o inventário do LoL)

Gume do Infinito, Capuz da Morte de Rabadon, Armadura de Warmog, Botas da Rapidez, Botas Jônicas da Lucidez, Criafendas, Armadura de Espinhos, Furacão de Runaan, Moeda Antiga, Sedenta por Sangue e Dente de Nashor.

### Inimigos e eventos

- **Tropas:** corpo a corpo, mágicas (atiram), de cerco e supertropas. Ondas de tropas em formação aparecem periodicamente.
- **Selva:** grasnadores, lobos sombrios, krugs (que se dividem ao morrer) e larvas do Vazio.
- **Elites:** Gromp (atira em leque) e Caranguejo do Rio (foge; se você alcançar, ganha um baú).
- **Chefes:**
  - **Arauto da Fenda** (3:00): faz investidas.
  - **Dragão Infernal** (7:00): ao morrer, dá +8% de dano permanente.
  - **Barão Na'Shor** (11:00): ao morrer, dá a Mão do Barão (+40% de dano por 2 min).
  - **Dragão Ancião** (13:30): ao morrer, dá execução de inimigos com pouca vida.
- **Baús Hextec:** deixados por elites e chefes, dão melhorias grátis.
- **Coletáveis:** gemas de experiência, ouro (usado para rerrolar), Fruta de Mel (cura) e Lente do Oráculo (atrai todas as gemas).

Ao vencer, você pode seguir no **modo infinito**, com chefes a cada minuto e dificuldade crescente. Os recordes de cada campeão ficam salvos no navegador.

## Estrutura do código

```
index.html        telas (menu, nível, baú, pausa, fim de jogo)
css/style.css     visual da interface (paleta hextech dourado/azul-petróleo)
js/utils.js       utilidades e grade espacial para colisões
js/audio.js       efeitos sonoros sintetizados com WebAudio
js/data.js        campeões, itens, inimigos, ondas e eventos
js/weapons.js     habilidades automáticas e ultimates
js/render.js      desenho procedural de cenário, campeões, inimigos e efeitos
js/hud.js         interface durante a partida (barras, inventário, anúncios)
js/input.js       teclado e joystick virtual para toque
js/ui.js          telas em HTML
js/game.js        loop principal, jogador, inimigos, dano e progressão
```

Para criar uma nova habilidade, adicione uma entrada em `WEAPONS` (`js/weapons.js`) com `stats`, `init`, `update` e, se precisar, `draw`/`drawGround`. Para novos itens, inimigos ou eventos, edite `js/data.js`.

---

*Projeto de fã, sem fins lucrativos. League of Legends e todos os nomes relacionados são marcas da Riot Games, Inc. Este projeto não é afiliado nem endossado pela Riot Games. Todos os gráficos são desenhados por código; nenhum asset oficial é usado.*
